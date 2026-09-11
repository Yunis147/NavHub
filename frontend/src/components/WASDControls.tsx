import { useCallback, useEffect, useRef } from 'react';
import { useRos } from '../services/ros';
import { publishTwist, publishZero, type Twist2D } from '../services/cmdVel';
import { MAX_LINEAR, MAX_ANGULAR } from '../config';

// WASD button grid for teleop: 3x3 with on-screen buttons + keyboard shortcuts.
// Each button is press-and-hold (or key-down). Keyboard reuses KeyboardTeleop logic.
// X = immediate stop (publishes zero).
export function WASDControls({ enabled }: { enabled: boolean }) {
  const { ros, status } = useRos();
  const target = useRef<Twist2D>({ vx: 0, vy: 0, wz: 0 });
  const pressed = useRef<Set<string>>(new Set());
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const compute = useCallback(() => {
    const p = pressed.current;
    const newTarget: Twist2D = {
      vx: (p.has('w') ? MAX_LINEAR : 0) - (p.has('s') ? MAX_LINEAR : 0),
      vy: (p.has('a') ? MAX_LINEAR : 0) - (p.has('d') ? MAX_LINEAR : 0),
      wz: (p.has('q') ? MAX_ANGULAR : 0) - (p.has('e') ? MAX_ANGULAR : 0),
    };
    target.current = newTarget;
    if (ros && status === 'connected') {
      publishTwist(ros, newTarget);
    }
  }, [ros, status]);

  // Publish loop at ~10 Hz (reuse from useTeleop pattern)
  useEffect(() => {
    if (!ros || !enabled || status !== 'connected') return;
    const id = setInterval(() => {
      publishTwist(ros, target.current);
    }, 100);
    return () => {
      clearInterval(id);
      if (status === 'connected') publishZero(ros);
    };
  }, [ros, enabled, status]);

  // Keyboard handling
  useEffect(() => {
    const keys = ['w', 'a', 's', 'd', 'q', 'e', 'x'] as const;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!keys.includes(k as any) || !enabledRef.current) return;
      e.preventDefault();

      // X is immediate stop
      if (k === 'x') {
        pressed.current.clear();
        target.current = { vx: 0, vy: 0, wz: 0 };
        if (ros && status === 'connected') publishZero(ros);
      } else if (!pressed.current.has(k)) {
        pressed.current.add(k);
        compute();
      }
    };

    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!keys.includes(k as any)) return;
      if (k !== 'x' && pressed.current.delete(k)) {
        compute();
      }
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [ros, status, compute]);

  // Button press handlers (mouse/touch)
  const onMouseDown = (key: string) => {
    if (!enabled) return;
    if (key === 'x') {
      pressed.current.clear();
      target.current = { vx: 0, vy: 0, wz: 0 };
      if (ros && status === 'connected') publishZero(ros);
    } else {
      pressed.current.add(key);
      compute();
    }
  };

  const onMouseUp = (key: string) => {
    if (key === 'x') return; // X doesn't have a release action
    if (pressed.current.delete(key)) {
      compute();
    }
  };

  const Button = ({ label, keys }: { label: string; keys?: string }) => (
    <button
      type="button"
      className={`
        rounded-lg px-3 py-4 font-semibold text-white transition-all select-none
        ${label === 'X' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}
        ${!enabled ? 'cursor-not-allowed opacity-40' : 'active:scale-95 active:shadow-lg'}
        font-mono text-lg
      `}
      onMouseDown={() => onMouseDown(label.toLowerCase())}
      onMouseUp={() => onMouseUp(label.toLowerCase())}
      onMouseLeave={() => onMouseUp(label.toLowerCase())}
      onTouchStart={() => onMouseDown(label.toLowerCase())}
      onTouchEnd={() => onMouseUp(label.toLowerCase())}
      disabled={!enabled}
      title={keys}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-lg bg-slate-800 px-6 py-6">
      <div className="mb-4 text-center text-sm font-semibold text-slate-300">
        Press and hold buttons or use keyboard
      </div>
      <div className="grid grid-cols-3 gap-2">
        {/* Row 1: Q W E */}
        <Button label="Q" keys="Q key: Rotate left" />
        <Button label="W" keys="W key: Forward" />
        <Button label="E" keys="E key: Rotate right" />

        {/* Row 2: A S D */}
        <Button label="A" keys="A key: Strafe left" />
        <Button label="S" keys="S key: Backward" />
        <Button label="D" keys="D key: Strafe right" />

        {/* Row 3: Empty, X, Empty */}
        <div />
        <Button label="X" keys="X key: Immediate stop" />
        <div />
      </div>
    </div>
  );
}
