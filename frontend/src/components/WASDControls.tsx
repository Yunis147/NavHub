import { useTeleopContext } from '../contexts/TeleopContext';

const MOVE_BINDINGS: Record<string, [number, number, number]> = {
  'w': [1, 0, 0],   // forward
  's': [-1, 0, 0],  // backward
  'a': [0, 1, 0],   // strafe left
  'd': [0, -1, 0],  // strafe right
  'q': [0, 0, 1],   // rotate left (ccw)
  'e': [0, 0, -1],  // rotate right (cw)
};

// WASD button grid for teleop: 3x3 with on-screen buttons.
// Keyboard shortcuts are handled globally by KeyboardTeleop in App.tsx.
// Click to move (sticky). X = immediate stop (publishes zero).
export function WASDControls({ enabled }: { enabled: boolean }) {
  const teleop = useTeleopContext();

  // Button press handlers (mouse/touch)
  const onMouseDown = (key: string) => {
    if (!enabled) return;
    if (key === 'x') {
      teleop.stop();
    } else if (MOVE_BINDINGS[key]) {
      const [x, y, w] = MOVE_BINDINGS[key];
      teleop.setTwist({
        vx: x * teleop.speed,
        vy: y * teleop.speed,
        wz: w * teleop.turn,
      });
    }
  };

  const Button = ({ label, keys, icon }: { label: string; keys?: string; icon?: string }) => (
    <button
      type="button"
      className={`
        group relative flex flex-col items-center justify-center rounded-xl px-4 py-6 font-semibold text-white transition-all select-none shadow-lg
        ${label === 'X'
          ? 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 ring-2 ring-red-900/50 active:scale-95'
          : 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 ring-1 ring-blue-900/50 active:scale-95'}
        ${!enabled ? 'cursor-not-allowed opacity-40' : 'hover:shadow-2xl'}
      `}
      onPointerDown={() => onMouseDown(label.toLowerCase())}
      disabled={!enabled}
      title={keys}
    >
      <span className="text-2xl font-bold">{label}</span>
      {icon && <span className="mt-1 text-xs opacity-75">{icon}</span>}
    </button>
  );

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-300">
           Speed: {teleop.speed.toFixed(2)} m/s   Turn: {teleop.turn.toFixed(2)} rad/s
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => teleop.adjustSpeed(-0.1)} 
             disabled={!enabled} 
             className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-xs disabled:opacity-50"
             title="Reduce speed (-)"
           > - </button>
           <button 
             onClick={() => teleop.adjustSpeed(0.1)} 
             disabled={!enabled} 
             className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-xs disabled:opacity-50"
             title="Increase speed (+)"
           > + </button>
        </div>
      </div>
      <div className="mb-4 text-center text-xs text-slate-400">
        Press once to move, X to stop
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
