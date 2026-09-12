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
    <div className="space-y-4">
      {/* Mapping control */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            SLAM Mapping
          </div>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            {mapping ? (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-400">SLAM Active</span>
              </>
            ) : (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                <span className="text-sm font-semibold text-slate-400">Idle</span>
              </>
            )}
          </div>
          <p className="mb-4 text-xs text-slate-400">
            {mapping ? 'Drive around to build the map. The map updates in real-time.' : 'Start mapping to begin SLAM'}
          </p>
          {mapping ? (
            <button
              type="button"
              onClick={() => void stop()}
              disabled={busy}
              className="w-full rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-md hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              Stop Mapping
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void start()}
              disabled={!hasControl || mode !== 'idle' || busy}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
            >
              Start Mapping
            </button>
          )}
        </div>
      </div>

      {/* Save Map section - shows after mapping stops or while mapping */}
      {(mode === 'idle' || mapping) && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Save Map
            </div>
          </div>
          <div className="p-4 space-y-3">
            <input
              type="text"
              placeholder="Enter map name (e.g., room_1)"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
            />
            <button
              type="button"
              onClick={() => void save()}
              disabled={!hasControl || !mapName.trim() || busy}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
            >
              {busy ? 'Saving...' : 'Save Map'}
            </button>
            {error && (
              <div className="rounded-lg bg-red-950/50 border border-red-900/50 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}
            {saveSuccess && (
              <div className="rounded-lg bg-green-950/50 border border-green-900/50 px-3 py-2 text-xs text-green-400">
                ✓ Map saved successfully!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
