import { useState } from 'react';
import { startMapping, stopMapping, type ServerState } from '../services/api';

// Phase 2: start/stop slam_toolbox on the robot. Start needs the control token (Rule 10);
// stop is always allowed. Mode comes from the server so every client sees mapping state.
export function MappingControls({
  hasControl,
  token,
  mode,
}: {
  hasControl: boolean;
  token: string | null;
  mode: ServerState['mode'];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapping = mode === 'mapping';

  const start = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await startMapping(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to start mapping');
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    setError(null);
    try {
      await stopMapping();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-800 px-4 py-3">
      <div className="text-sm">
        <div className="font-semibold">Mapping</div>
        <div className="text-slate-400">
          {mapping ? 'SLAM running — drive to build the map' : 'idle'}
          {error && <span className="ml-2 text-red-400">{error}</span>}
        </div>
      </div>
      {mapping ? (
        <button
          type="button"
          onClick={() => void stop()}
          disabled={busy}
          className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-500 disabled:opacity-50"
        >
          Stop Mapping
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void start()}
          disabled={!hasControl || mode !== 'idle' || busy}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          Start Mapping
        </button>
      )}
    </div>
  );
}
