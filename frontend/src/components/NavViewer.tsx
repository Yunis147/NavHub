import { useEffect, useRef, useState, useMemo } from 'react';
import type { Pose2D } from '../lib/tf2d';
import type { OccupancyGrid } from '../hooks/useSlamMap';

// Advanced 2D Viewer for Navigation (Phase 4).
// Handles rendering the map and capturing initial/goal pose clicks with orientation drag.

function getGridBounds(grid: OccupancyGrid | null, pose: Pose2D | null) {
  if (!grid || grid.info.width === 0 || grid.info.height === 0) {
    return null;
  }
  const W = grid.info.width;
  const H = grid.info.height;
  const d = grid.data;
  const { resolution: res, origin } = grid.info;

  // Find bounding box of obstacles (val === 100) instead of all known space
  // This prevents the massive LiDAR free-space radius from squashing the map
  let minX = W, maxX = 0, minY = H, maxY = 0;
  let hasKnown = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[y * W + x] >= 90) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasKnown = true;
      }
    }
  }

  if (!hasKnown) {
    if (pose) {
       const gx = Math.floor((pose.x - origin.position.x) / res);
       const gy = Math.floor((pose.y - origin.position.y) / res);
       minX = gx - 40; maxX = gx + 40;
       minY = gy - 40; maxY = gy + 40;
    } else {
       minX = Math.floor(W / 2) - 40;
       maxX = Math.floor(W / 2) + 40;
       minY = Math.floor(H / 2) - 40;
       maxY = Math.floor(H / 2) + 40;
    }
  }

  const margin = 40;
  minX = Math.max(0, minX - margin);
  maxX = Math.min(W - 1, maxX + margin);
  minY = Math.max(0, minY - margin);
  maxY = Math.min(H - 1, maxY + margin);

  return { minX, minY, maxX, maxY, cropW: maxX - minX + 1, cropH: maxY - minY + 1, origW: W, origH: H };
}

function draw(canvas: HTMLCanvasElement, grid: OccupancyGrid | null, pose: Pose2D | null,
              dragStart: {x: number, y: number} | null, dragCurrent: {x: number, y: number} | null,
              interactMode: string, bounds: ReturnType<typeof getGridBounds>): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cw = canvas.width;
  const ch = canvas.height;

  // Dark background
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(0, 0, cw, ch);

  if (!grid || !bounds) {
    ctx.fillStyle = '#475569';
    ctx.font = '16px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Waiting for Nav2 map...', cw / 2, ch / 2 - 10);
    return;
  }

  const { resolution: res, origin } = grid.info;
  const d = grid.data;
  const { minX, minY, cropW, cropH, origW } = bounds;

  // Rasterize ONLY the cropped map block
  const off = document.createElement('canvas');
  off.width = cropW; off.height = cropH;
  const octx = off.getContext('2d')!;
  const img = octx.createImageData(cropW, cropH);
  for (let cy = 0; cy < cropH; cy++) {
    for (let cx = 0; cx < cropW; cx++) {
      const srcX = minX + cx;
      const srcY = minY + cy;
      const v = d[srcY * origW + srcX];
      const g = v < 0 ? 30 : 255 - Math.round((v / 100) * 255);
      const o = (cy * cropW + cx) * 4;
      // Blueish tint for navigation mode empty space, dark blue for walls
      img.data[o] = v < 0 ? 15 : g < 100 ? 15 : g;
      img.data[o+1] = v < 0 ? 23 : g < 100 ? 23 : g;
      img.data[o+2] = v < 0 ? 42 : g < 100 ? 42 : g;
      img.data[o+3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);

  const scale = Math.min(cw / cropW, ch / cropH);
  const dw = cropW * scale;
  const dh = cropH * scale;
  const offX = (cw - dw) / 2;
  const offY = (ch - dh) / 2;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(offX, offY + dh);
  ctx.scale(scale, -scale);
  ctx.drawImage(off, 0, 0);

  // Draw robot
  if (pose) {
    const gx = (pose.x - origin.position.x) / res - minX;
    const gy = (pose.y - origin.position.y) / res - minY;
    const k = 12 / scale;
    ctx.translate(gx, gy);
    ctx.rotate(pose.yaw);
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(-k * 0.6, k * 0.6);
    ctx.lineTo(-k * 0.6, -k * 0.6);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-k, 0, k, 0);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(1, '#60a5fa');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();

    // reset transform for drag drawing
    ctx.rotate(-pose.yaw);
    ctx.translate(-gx, -gy);
  }

  // Draw interaction drag arrow
  if (dragStart && dragCurrent) {
    const k = 15 / scale;
    const dx = dragCurrent.x - dragStart.x;
    const dy = dragCurrent.y - dragStart.y;
    // y is flipped visually so angle calculation in screen space uses -dy
    const angle = Math.atan2(-dy, dx);

    // Convert logic coordinates (which are mapped starting from origin 0,0 relative to cropW)
    const renderStartX = dragStart.x - minX;
    const renderStartY = dragStart.y - minY;

    ctx.translate(renderStartX, renderStartY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(k*1.5, 0);
    ctx.lineTo(-k * 0.6, k * 0.6);
    ctx.lineTo(-k * 0.6, -k * 0.6);
    ctx.closePath();
    ctx.fillStyle = interactMode === 'goal_pose' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(79, 70, 229, 0.7)';
    ctx.fill();
    ctx.strokeStyle = interactMode === 'goal_pose' ? '#059669' : '#4338ca';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
  }

  ctx.restore();

  // Draw border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(offX, offY, dw, dh);
}

export function NavViewer({
  grid,
  robotPose,
  interactMode,
  onSetInitialPose,
  onSetGoalPose
}: {
  grid: OccupancyGrid | null;
  robotPose: Pose2D | null;
  interactMode: 'view' | 'initial_pose' | 'goal_pose';
  onSetInitialPose?: (p: Pose2D) => void;
  onSetGoalPose?: (p: Pose2D) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{x: number, y: number} | null>(null);

  // Compute crop bounds whenever grid data changes
  const bounds = useMemo(() => getGridBounds(grid, robotPose), [grid, robotPose]);

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
      draw(canvas, grid, robotPose, dragStart, dragCurrent, interactMode, bounds);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [grid, robotPose, dragStart, dragCurrent, interactMode, bounds]);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, grid, robotPose, dragStart, dragCurrent, interactMode, bounds);
  }, [grid, robotPose, dragStart, dragCurrent, interactMode, bounds]);

  const getGridCoordsFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!bounds || !grid) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    // Raw screen coords
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width;
    const ch = canvas.height;

    const scale = Math.min(cw / bounds.cropW, ch / bounds.cropH);
    const offX = (cw - (bounds.cropW * scale)) / 2;
    const offY = (ch - (bounds.cropH * scale)) / 2;

    // This gives us the X, Y coordinate RELATIVE to the cropped bounding box (0 -> cropW)
    const u_cropped = (cx * dpr - offX) / scale;
    const v_cropped = ((offY + bounds.cropH * scale) - cy * dpr) / scale;

    // Add the minX, minY offset back to get the RAW underlying grid coordinate
    return {
      x: u_cropped + bounds.minX,
      y: v_cropped + bounds.minY
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (interactMode === 'view' || !grid) return;
    const coords = getGridCoordsFromPointer(e);
    if (!coords) return;

    setDragStart(coords);
    setDragCurrent(coords);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart || interactMode === 'view' || !grid) return;
    const coords = getGridCoordsFromPointer(e);
    if (!coords) return;

    setDragCurrent(coords);
  };

  const handlePointerUp = () => {
    if (!dragStart || !dragCurrent || interactMode === 'view' || !grid) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    // Calculate final yaw and send pose
    const dx = dragCurrent.x - dragStart.x;
    const dy = dragCurrent.y - dragStart.y;
    // Y is physically +up in base map space, so we don't invert dy here
    const yaw = Math.atan2(dy, dx);

    // Absolute world coordinates: x_meters = origin_x + (grid_x * res)
    const X_m = grid.info.origin.position.x + (dragStart.x * grid.info.resolution);
    const Y_m = grid.info.origin.position.y + (dragStart.y * grid.info.resolution);

    console.log(`Dispatched ${interactMode}: x=${X_m.toFixed(2)}, y=${Y_m.toFixed(2)}, yaw=${(yaw*180/Math.PI).toFixed(1)}`);

    if (interactMode === 'initial_pose' && onSetInitialPose) {
      onSetInitialPose({ x: X_m, y: Y_m, yaw });
    } else if (interactMode === 'goal_pose' && onSetGoalPose) {
      onSetGoalPose({ x: X_m, y: Y_m, yaw });
    }

    setDragStart(null);
    setDragCurrent(null);
  };

  return (
    <div ref={containerRef} className="h-full w-full rounded-xl bg-slate-900 ring-1 ring-slate-700 shadow-2xl relative cursor-crosshair">
      <canvas
        ref={canvasRef}
        className="h-full w-full rounded-xl touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {interactMode !== 'view' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-800/90 border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-200 shadow-lg pointer-events-none backdrop-blur animate-pulse">
          Click and drag to set {interactMode === 'initial_pose' ? 'Initial Pose' : 'Goal Pose'}
        </div>
      )}
    </div>
  );
}