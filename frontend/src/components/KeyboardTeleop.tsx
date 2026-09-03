import { useEffect, useRef } from 'react';
import { MAX_ANGULAR, MAX_LINEAR } from '../config';
import type { Twist2D } from '../services/cmdVel';

const KEYS = ['w', 'a', 's', 'd', 'q', 'e'] as const;
type Key = (typeof KEYS)[number];
const isKey = (k: string): k is Key => (KEYS as readonly string[]).includes(k);

// WASD = translate (w/s = vx, a/d = vy), Q/E = rotate (wz). Headless: publishes through
// the shared teleop target via onTwist. Releasing all keys sends zero.
export function KeyboardTeleop({
  enabled,
  onTwist,
}: {
  enabled: boolean;
  onTwist: (t: Twist2D) => void;
}) {
  const pressed = useRef<Set<Key>>(new Set());
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const compute = () => {
      const p = pressed.current;
      onTwist({
        vx: (p.has('w') ? MAX_LINEAR : 0) - (p.has('s') ? MAX_LINEAR : 0),
        vy: (p.has('a') ? MAX_LINEAR : 0) - (p.has('d') ? MAX_LINEAR : 0),
        wz: (p.has('q') ? MAX_ANGULAR : 0) - (p.has('e') ? MAX_ANGULAR : 0),
      });
    };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!isKey(k) || !enabledRef.current) return;
      e.preventDefault();
      if (!pressed.current.has(k)) {
        pressed.current.add(k);
        compute();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!isKey(k)) return;
      if (pressed.current.delete(k)) compute();
    };
    const clear = () => {
      if (pressed.current.size) {
        pressed.current.clear();
        onTwist({ vx: 0, vy: 0, wz: 0 });
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, [onTwist]);

  return null;
}
