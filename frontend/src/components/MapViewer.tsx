import { useEffect, useRef } from 'react';
import type { Pose2D } from '../lib/tf2d';
import type { OccupancyGrid } from '../hooks/useSlamMap';

// Renders a live nav_msgs/OccupancyGrid to a canvas, with the robot drawn as an oriented
// arrow. ROS grids are row-major with row 0 at the MIN-y edge and +y up, so we flip the
// canvas Y so the map isn't drawn upside down.
// ponytail: plain JSON grid + full redraw per update (throttled ~1 Hz). Fine for a room-sized
// map; if a large map stutters over the LAN, switch the /map subscription to cbor compression.

function draw(canvas: HTMLCanvasElement, grid: OccupancyGrid | null, pose: Pose2D | null): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cw = canvas.width;
  const ch = canvas.height;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, cw, ch);

  if (!grid || grid.info.width === 0 || grid.info.height === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('waiting for /map — start mapping and drive', cw / 2, ch / 2);
    return;
  }

  const { width: W, height: H, resolution: res, origin } = grid.info;
  const d = grid.data;

  // Rasterize the grid at native resolution on an offscreen canvas.
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  const octx = off.getContext('2d');
  if (!octx) return;
  const img = octx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const v = d[i];
    const g = v < 0 ? 90 : 255 - Math.round((v / 100) * 255); // unknown gray; free white; occ black
    const o = i * 4;
    img.data[o] = g;
    img.data[o + 1] = g;
    img.data[o + 2] = g;
    img.data[o + 3] = 255;
  }
  octx.putImageData(img, 0, 0);

  // Fit the grid into the canvas, preserving aspect ratio.
  const scale = Math.min(cw / W, ch / H);
  const dw = W * scale;
  const dh = H * scale;
  const offX = (cw - dw) / 2;
  const offY = (ch - dh) / 2;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(offX, offY + dh);
  ctx.scale(scale, -scale); // grid-pixel units, +y up
  ctx.drawImage(off, 0, 0);

  if (pose) {
    const gx = (pose.x - origin.position.x) / res; // world metres -> grid pixels
    const gy = (pose.y - origin.position.y) / res;
    const k = 9 / scale; // ~9 screen px regardless of zoom
    ctx.translate(gx, gy);
    ctx.rotate(pose.yaw);
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(-k * 0.6, k * 0.6);
    ctx.lineTo(-k * 0.6, -k * 0.6);
    ctx.closePath();
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
  }
  ctx.restore();
}

export function MapViewer({
  grid,
  robotPose,
}: {
  grid: OccupancyGrid | null;
  robotPose: Pose2D | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) draw(ref.current, grid, robotPose);
  }, [grid, robotPose]);

  return (
    <canvas
      ref={ref}
      width={360}
      height={360}
      className="w-full rounded-lg bg-slate-950 ring-1 ring-slate-800"
    />
  );
}
