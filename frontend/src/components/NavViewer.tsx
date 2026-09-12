import { useEffect, useRef, useState } from 'react';
import type { Pose2D } from '../lib/tf2d';
import type { OccupancyGrid } from '../hooks/useSlamMap';

// Advanced 2D Viewer for Navigation (Phase 4).
// Handles rendering the map and capturing initial/goal pose clicks with orientation drag.

function draw(canvas: HTMLCanvasElement, grid: OccupancyGrid | null, pose: Pose2D | null, 
              dragStart: {x: number, y: number} | null, dragCurrent: {x: number, y: number} | null, interactMode: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cw = canvas.width;
  const ch = canvas.height;

  // Dark background
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(0, 0, cw, ch);

  if (!grid || grid.info.width === 0 || grid.info.height === 0) {
    ctx.fillStyle = '#475569';
    ctx.font = '16px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Waiting for Nav2 map...', cw / 2, ch / 2 - 10);
    return;
  }

  const { width: W, height: H, resolution: res, origin } = grid.info;
  const d = grid.data;

  // Rasterize map (cache this in production to avoid redrawing every frame)
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const octx = off.getContext('2d')!;
  const img = octx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const v = d[i];
    const g = v < 0 ? 30 : 255 - Math.round((v / 100) * 255); 
    const o = i * 4;
    // Blueish tint for navigation mode empty space, dark blue for walls
    img.data[o] = v < 0 ? 15 : g < 100 ? 15 : g;
    img.data[o+1] = v < 0 ? 23 : g < 100 ? 23 : g;
    img.data[o+2] = v < 0 ? 42 : g < 100 ? 42 : g;
    img.data[o+3] = 255;
  }
  octx.putImageData(img, 0, 0);

  const scale = Math.min(cw / W, ch / H);
  const dw = W * scale;
  const dh = H * scale;
  const offX = (cw - dw) / 2;
  const offY = (ch - dh) / 2;

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(offX, offY + dh);
  ctx.scale(scale, -scale); 
  ctx.drawImage(off, 0, 0);

  // Draw robot
  if (pose) {
    const gx = (pose.x - origin.position.x) / res; 
    const gy = (pose.y - origin.position.y) / res;
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
    
    ctx.translate(dragStart.x, dragStart.y);
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
      draw(canvas, grid, robotPose, dragStart, dragCurrent, interactMode);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [grid, robotPose, dragStart, dragCurrent, interactMode]);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, grid, robotPose, dragStart, dragCurrent, interactMode);
  }, [grid, robotPose, dragStart, dragCurrent, interactMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (interactMode === 'view' || !grid) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Raw screen coords
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    // Convert to grid pixels
    const W = grid.info.width;
    const H = grid.info.height;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width;
    const ch = canvas.height;
    
    const scale = Math.min(cw / W, ch / H);
    const offX = (cw - (W * scale)) / 2;
    const offY = (ch - (H * scale)) / 2;
    
    const u = (cx * dpr - offX) / scale;
    const v = ((offY + H * scale) - cy * dpr) / scale;
    
    setDragStart({ x: u, y: v });
    setDragCurrent({ x: u, y: v });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart || interactMode === 'view' || !grid) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const W = grid.info.width;
    const H = grid.info.height;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.min(cw / W, ch / H);
    const offX = (cw - (W * scale)) / 2;
    const offY = (ch - (H * scale)) / 2;
    
    const u = (cx * dpr - offX) / scale;
    const v = ((offY + H * scale) - cy * dpr) / scale;
    setDragCurrent({ x: u, y: v });
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
