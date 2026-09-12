export function TeleopInstructions() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 shadow-lg">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-blue-500/20 p-2">
          <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="text-lg font-semibold text-slate-100">Control Instructions</div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex gap-1">
            <kbd className="rounded-md bg-slate-700 px-3 py-1.5 font-mono text-sm font-semibold shadow-md">W</kbd>
            <kbd className="rounded-md bg-slate-700 px-3 py-1.5 font-mono text-sm font-semibold shadow-md">S</kbd>
          </div>
          <div className="pt-1">
            <div className="font-medium text-slate-200">Forward / Backward</div>
            <div className="text-xs text-slate-400">Linear motion along robot's front axis</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex gap-1">
            <kbd className="rounded-md bg-slate-700 px-3 py-1.5 font-mono text-sm font-semibold shadow-md">A</kbd>
            <kbd className="rounded-md bg-slate-700 px-3 py-1.5 font-mono text-sm font-semibold shadow-md">D</kbd>
          </div>
          <div className="pt-1">
            <div className="font-medium text-slate-200">Strafe Left / Right</div>
            <div className="text-xs text-slate-400">Omni-wheel lateral movement</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex gap-1">
            <kbd className="rounded-md bg-slate-700 px-3 py-1.5 font-mono text-sm font-semibold shadow-md">Q</kbd>
            <kbd className="rounded-md bg-slate-700 px-3 py-1.5 font-mono text-sm font-semibold shadow-md">E</kbd>
          </div>
          <div className="pt-1">
            <div className="font-medium text-slate-200">Rotate Left / Right</div>
            <div className="text-xs text-slate-400">Turn in place around robot center</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <kbd className="rounded-md bg-red-900 px-3 py-1.5 font-mono text-sm font-semibold text-red-200 shadow-md ring-2 ring-red-700">
            X
          </kbd>
          <div className="pt-1">
            <div className="font-medium text-red-300">Emergency Stop</div>
            <div className="text-xs text-red-400">Immediately halt all motion</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-slate-300">💡 Tip:</span> Press and hold keys to move. Release to stop smoothly.
          Multiple keys can be pressed simultaneously for diagonal movement.
        </div>
      </div>
    </div>
  );
}
