import { useEffect } from 'react';
import type { Twist2D } from '../services/cmdVel';

const MOVE_BINDINGS: Record<string, [number, number, number]> = {
  'w': [1, 0, 0],   // forward
  's': [-1, 0, 0],  // backward
  'a': [0, 1, 0],   // strafe left
  'd': [0, -1, 0],  // strafe right
  'q': [0, 0, 1],   // rotate left (ccw)
  'e': [0, 0, -1],  // rotate right (cw)
};

export function KeyboardTeleop({
  enabled,
  onTwist,
  onStop,
  speed,
  turn,
  onSpeedAdjust
}: {
  enabled: boolean;
  onTwist: (t: Twist2D) => void;
  onStop: () => void;
  speed: number;
  turn: number;
  onSpeedAdjust: (delta: number) => void;
}) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // If we're typing in an input, don't teleop
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const k = e.key.toLowerCase();
      if (!enabled) return;

      if (k === 'x') {
        e.preventDefault();
        onStop();
      } else if (k === '+' || k === '=') {
        e.preventDefault();
        onSpeedAdjust(0.1);
      } else if (k === '-') {
        e.preventDefault();
        onSpeedAdjust(-0.1);
      } else if (MOVE_BINDINGS[k]) {
        e.preventDefault();
        const [x, y, w] = MOVE_BINDINGS[k];
        onTwist({
          vx: x * speed,
          vy: y * speed,
          wz: w * turn,
        });
      }
    };
    
    // We remove the up() listener because it should be sticky (move until stopped)!
    window.addEventListener('keydown', down);
    return () => {
      window.removeEventListener('keydown', down);
    };
  }, [enabled, onTwist, onStop, speed, turn, onSpeedAdjust]);

  return null;
}
