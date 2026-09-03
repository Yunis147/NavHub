import nipplejs, { type JoystickManager, type JoystickOutputData } from 'nipplejs';
import { useEffect, useRef } from 'react';
import { MAX_LINEAR } from '../config';

// Omni translation stick: up = +vx (forward), right = -vy (strafe right, ROS +y is left).
// Rotation (wz) is on the keyboard (Q/E) — one stick stays legible on a phone.
export function Joystick({
  enabled,
  onVector,
  onRelease,
}: {
  enabled: boolean;
  onVector: (vx: number, vy: number) => void;
  onRelease: () => void;
}) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const mgr: JoystickManager = nipplejs.create({
      zone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#3b82f6',
      size: 140,
    });
    mgr.on('move', (_evt, data: JoystickOutputData) => {
      if (!enabledRef.current || !data.vector) return;
      onVector(data.vector.y * MAX_LINEAR, -data.vector.x * MAX_LINEAR);
    });
    mgr.on('end', () => onRelease());
    return () => mgr.destroy();
  }, [onVector, onRelease]);

  return (
    <div
      ref={zoneRef}
      className="relative h-56 w-56 rounded-full bg-slate-800 ring-1 ring-slate-700 transition-opacity"
      style={{ opacity: enabled ? 1 : 0.4 }}
    />
  );
}
