export function TeleopInstructions() {
  return (
    <div className="rounded-lg bg-slate-800 px-4 py-3 text-sm">
      <div className="mb-2 font-semibold text-blue-400">Controls</div>
      <div className="space-y-1 text-slate-300">
        <div>
          <span className="font-mono font-semibold text-slate-100">W/S</span> — Move forward/backward
        </div>
        <div>
          <span className="font-mono font-semibold text-slate-100">A/D</span> — Strafe left/right
        </div>
        <div>
          <span className="font-mono font-semibold text-slate-100">Q/E</span> — Rotate left/right
        </div>
        <div>
          <span className="font-mono font-semibold text-slate-100">X</span> — Immediate stop
        </div>
        <div className="border-t border-slate-700 pt-2 text-xs text-slate-400">
          Click and hold buttons or press keys on your keyboard
        </div>
      </div>
    </div>
  );
}
