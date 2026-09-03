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
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-800 px-4 py-3">
      <div className="text-sm">
        <div className="font-semibold">
          {hasControl ? 'You have control' : heldByOther ? 'Another client is driving' : 'No one has control'}
        </div>
        <div className="text-slate-400">
          mode: <span className="font-mono">{server.mode}</span>
          {!server.teleopAllowed && ' — teleop disabled (navigating)'}
          {error && <span className="ml-2 text-red-400">{error}</span>}
        </div>
      </div>
      {hasControl ? (
        <button
          type="button"
          onClick={onRelease}
          className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-500"
        >
          Release
        </button>
      ) : (
        <button
          type="button"
          onClick={onTake}
          disabled={heldByOther}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          Take control
        </button>
      )}
    </div>
  );
}
