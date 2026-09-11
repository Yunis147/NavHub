import { useState } from 'react';
import { startMapping, stopMapping, saveMap, type ServerState } from '../services/api';

// Phase 2: start/stop slam_toolbox on the robot. Start needs the control token (Rule 10);
// stop is always allowed. Mode comes from the server so every client sees mapping state.
// Phase 3: added map saving with duplicate-name prevention.
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
  const [mapName, setMapName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const mapping = mode === 'mapping';

  const start = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    setSaveSuccess(false);
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

  const save = async () => {
    if (!token || !mapName.trim()) return;
    setBusy(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await saveMap(token, mapName.trim());
      setSaveSuccess(true);
      setMapName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to save map');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-800 px-4 py-3">
        <div className="text-sm">
          <div className="font-semibold">Mapping</div>
          <div className="text-slate-400">
            {mapping ? 'SLAM running — drive to build the map' : 'idle'}
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

      {/* Save Map section - shows after mapping stops or while mapping */}
      {(mode === 'idle' || mapping) && (
        <div className="flex flex-col gap-2 rounded-lg bg-slate-800 px-4 py-3">
          <div className="text-sm font-semibold">Save Map</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Map name (e.g., room_1)"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              disabled={busy}
              className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void save()}
              disabled={!hasControl || !mapName.trim() || busy}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
            >
              Save
            </button>
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          {saveSuccess && <div className="text-sm text-green-400">Map saved successfully!</div>}
        </div>
      )}
    </div>
  );
}
