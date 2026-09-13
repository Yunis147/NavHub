import { useCallback, useRef } from 'react';
import { MAX_LINEAR, MAX_ANGULAR } from '../config';
import { useTeleopContext } from '../contexts/TeleopContext';

// WASD button grid for teleop: 3x3 with on-screen buttons.
// Keyboard shortcuts are handled globally by KeyboardTeleop in App.tsx.
// X = immediate stop (publishes zero).
export function WASDControls({ enabled }: { enabled: boolean }) {
  const teleop = useTeleopContext();
  const pressed = useRef<Set<string>>(new Set());

  const compute = useCallback(() => {
    const p = pressed.current;
    teleop.setTwist({
      vx: (p.has('w') ? MAX_LINEAR : 0) - (p.has('s') ? MAX_LINEAR : 0),
      vy: (p.has('a') ? MAX_LINEAR : 0) - (p.has('d') ? MAX_LINEAR : 0),
      wz: (p.has('q') ? MAX_ANGULAR : 0) - (p.has('e') ? MAX_ANGULAR : 0),
    });
  }, [teleop]);

  // Button press handlers (mouse/touch)
  const onMouseDown = (key: string) => {
    if (!enabled) return;
    if (key === 'x') {
      pressed.current.clear();
      teleop.stop();
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

  const Button = ({ label, keys, icon }: { label: string; keys?: string; icon?: string }) => (
    <button
      type="button"
      className={`
        group relative flex flex-col items-center justify-center rounded-xl px-4 py-6 font-semibold text-white transition-all select-none shadow-lg
        ${label === 'X'
          ? 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 ring-2 ring-red-900/50'
          : 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 ring-1 ring-blue-900/50'}
        ${!enabled ? 'cursor-not-allowed opacity-40' : 'active:scale-95 active:shadow-xl hover:shadow-2xl'}
      `}
      onMouseDown={() => onMouseDown(label.toLowerCase())}
      onMouseUp={() => onMouseUp(label.toLowerCase())}
      onMouseLeave={() => onMouseUp(label.toLowerCase())}
      onTouchStart={() => onMouseDown(label.toLowerCase())}
      onTouchEnd={() => onMouseUp(label.toLowerCase())}
      disabled={!enabled}
      title={keys}
    >
      <span className="text-2xl font-bold">{label}</span>
      {icon && <span className="mt-1 text-xs opacity-75">{icon}</span>}
    </button>
  );

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 shadow-lg">
      <div className="mb-4 text-center text-sm font-semibold text-slate-300">
        Press and hold to move
      </div>
      <div className="grid grid-cols-3 gap-3">
        {/* Row 1: Q W E */}
        <Button label="Q" keys="Q key: Rotate left" icon="↺" />
        <Button label="W" keys="W key: Forward" icon="↑" />
        <Button label="E" keys="E key: Rotate right" icon="↻" />

        {/* Row 2: A S D */}
        <Button label="A" keys="A key: Strafe left" icon="←" />
        <Button label="S" keys="S key: Backward" icon="↓" />
        <Button label="D" keys="D key: Strafe right" icon="→" />

        {/* Row 3: Empty, X, Empty */}
        <div />
        <Button label="X" keys="X key: Emergency stop" icon="■" />
        <div />
      </div>
    </div>
  );
}