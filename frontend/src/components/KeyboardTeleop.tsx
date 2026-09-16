import { useEffect } from 'react';
import type { Twist2D } from '../services/cmdVel';

const MOVE_BINDINGS: Record<string, [number, number, number]> = {
  'w': [1, 0, 0],
  's': [-1, 0, 0],
  'a': [0, 1, 0],
  'd': [0, -1, 0],
  'q': [0, 0, 1],
  'e': [0, 0, -1],
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
    const handler = (e: KeyboardEvent) => {
      // Must have control to drive
      if (!enabled) return;
      // Skip if explicitly typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const k = e.key.toLowerCase();

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
    
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [enabled, onTwist, onStop, speed, turn, onSpeedAdjust]);

  return null;
}
