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
      // Very basic tag check to avoid typed inputs
      if (e.repeat) return; // Prevent spamming if user holds key
      const el = e.target as HTMLElement;
      const tag = el?.tagName?.toLowerCase();
      // Ignore keys if the user is typing into any text input or editable element
      if (
        tag === 'input' || 
        tag === 'textarea' || 
        tag === 'select' || 
        tag === 'button' ||
        el?.isContentEditable
      ) {
        return;
      }
      
      const k = e.key.toLowerCase();

      // Don't intercept unless it's one of our keys
      if (!['w','a','s','d','q','e','x','+','=','-'].includes(k)) return;

      if (!enabled) {
         console.warn("Keyboard teleop ignored because you don't have control.");
         return;
      }

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
    
    // Capture at window level so a focused card, SVG/canvas, or nested control
    // cannot prevent browser teleop shortcuts from reaching this handler.
    window.addEventListener('keydown', handler, { capture: true });
    return () => {
      window.removeEventListener('keydown', handler, { capture: true });
    };
  }, [enabled, onTwist, onStop, speed, turn, onSpeedAdjust]);

  return null;
}
