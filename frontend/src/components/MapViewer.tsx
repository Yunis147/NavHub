import { useEffect, useRef } from 'react';
import type { Pose2D } from '../lib/tf2d';
import type { OccupancyGrid } from '../hooks/useSlamMap';

// Renders a live nav_msgs/OccupancyGrid to a canvas, with the robot drawn as an oriented
// arrow. ROS grids are row-major with row 0 at the MIN-y edge and +y up, so we flip the
// canvas Y so the map isn't drawn upside down.
// Updated: fills parent container instead of fixed 360×360.

function draw(canvas: HTMLCanvasElement, grid: OccupancyGrid | null, pose: Pose2D | null): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cw = canvas.width;
  const ch = canvas.height;

  // Dark background
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(0, 0, cw, ch);

  if (!grid || grid.info.width === 0 || grid.info.height === 0) {
    // Waiting state with styled message
    ctx.fillStyle = '#475569';
    ctx.font = '16px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Waiting for map data...', cw / 2, ch / 2 - 10);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('Start mapping and drive to see the map', cw / 2, ch / 2 + 15);
    return;
  }

  const { width: W, height: H, resolution: res, origin } = grid.info;
  const d = grid.data;

  // Find bounding box of known cells (val >= 0)
  let minX = W, maxX = 0, minY = H, maxY = 0;
  let hasKnown = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[y * W + x] >= 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasKnown = true;
      }
    }
  }

  // If map is completely unknown, use a small default bounding box around center
  if (!hasKnown) {
    minX = Math.floor(W / 2) - 10;
    maxX = Math.floor(W / 2) + 10;
    minY = Math.floor(H / 2) - 10;
    maxY = Math.floor(H / 2) + 10;
  }

  // Add a small margin (e.g., 20 pixels) to the bounding box
  const margin = 20;
  minX = Math.max(0, minX - margin);
  maxX = Math.min(W - 1, maxX + margin);
  minY = Math.max(0, minY - margin);
  maxY = Math.min(H - 1, maxY + margin);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // Rasterize the grid at native resolution on an offscreen canvas.
  // ONLY render the cropped region!
  const off = document.createElement('canvas');
  off.width = cropW;
  off.height = cropH;
  const octx = off.getContext('2d');
  if (!octx) return;
  const img = octx.createImageData(cropW, cropH);
  for (let cy = 0; cy < cropH; cy++) {
    for (let cx = 0; cx < cropW; cx++) {
      const srcX = minX + cx;
      const srcY = minY + cy;
      const v = d[srcY * W + srcX];
      const g = v < 0 ? 60 : 255 - Math.round((v / 100) * 255);
      const o = (cy * cropW + cx) * 4;
      img.data[o] = g;
      img.data[o + 1] = g;
      img.data[o + 2] = g;
      img.data[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);

  // Fit the cropped grid into the canvas, preserving aspect ratio.
  const scale = Math.min(cw / cropW, ch / cropH);
  const dw = cropW * scale;
  const dh = cropH * scale;
  const offX = (cw - dw) / 2;
  const offY = (ch - dh) / 2;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(offX, offY + dh);
  ctx.scale(scale, -scale); // grid-pixel units, +y up
  ctx.drawImage(off, 0, 0);

  // Draw robot as an oriented arrow
  if (pose) {
    const gx = (pose.x - origin.position.x) / res; // world metres -> absolute grid pixels
    // Translate relative to the cropped bounding box mapping!
    const croppedGx = gx - minX;
    const croppedGy = (pose.y - origin.position.y) / res - minY;

    const k = 12 / scale; // arrow size ~12 screen px regardless of zoom
    ctx.translate(croppedGx, croppedGy);
    ctx.rotate(pose.yaw);
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(-k * 0.6, k * 0.6);
    ctx.lineTo(-k * 0.6, -k * 0.6);
    ctx.closePath();

    // Gradient fill for robot arrow
    const grad = ctx.createLinearGradient(-k, 0, k, 0);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(1, '#60a5fa');
    ctx.fillStyle = grad;
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
  }
  ctx.restore();

  // Draw grid border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(offX, offY, dw, dh);
}

export function MapViewer({
  grid,
  robotPose,
}: {
  grid: OccupancyGrid | null;
  robotPose: Pose2D | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      draw(canvas, grid, robotPose);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [grid, robotPose]);

  // Redraw when data changes
  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, grid, robotPose);
  }, [grid, robotPose]);

  return (
    <div ref={containerRef} className="h-full w-full rounded-xl bg-slate-900 ring-1 ring-slate-700 shadow-2xl">
      <canvas ref={canvasRef} className="h-full w-full rounded-xl" />
    </div>
  );
}
