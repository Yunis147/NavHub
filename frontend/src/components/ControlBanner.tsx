import type { ServerState } from '../services/api';

// Shows arbitration state and the explicit take/release control (Rule 10).
export function ControlBanner({
  hasControl,
  server,
  error,
  onTake,
  onRelease,
}: {
  hasControl: boolean;
  server: ServerState;
  error: string | null;
  onTake: () => void;
  onRelease: () => void;
}) {
  const heldByOther = server.controlled && !hasControl;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Control Status
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              {hasControl ? (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                  <span className="font-semibold text-green-400">You have control</span>
                </>
              ) : heldByOther ? (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-semibold text-amber-400">Another client is driving</span>
                </>
              ) : (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                  <span className="font-semibold text-slate-400">No one has control</span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-400">
              Mode: <span className="font-mono font-semibold text-slate-300">{server.mode}</span>
              {!server.teleopAllowed && (
                <span className="ml-2 text-amber-400">· Teleop disabled (navigating)</span>
              )}
              {error && <span className="ml-2 text-red-400">· {error}</span>}
            </div>
          </div>
          {hasControl ? (
            <button
              type="button"
              onClick={onRelease}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 shadow-md hover:bg-slate-600 transition-colors"
            >
              Release
            </button>
          ) : (
            <button
              type="button"
              onClick={onTake}
              disabled={heldByOther}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
            >
              Take Control
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
