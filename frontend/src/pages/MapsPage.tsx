import { useEffect, useState } from 'react';
import { listMaps, deleteMap, type MapInfo } from '../services/api';
import { MapEditor } from '../components/MapEditor';
import { ConnectionStatus } from '../components/ConnectionStatus';

export default function MapsPage() {
  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMap, setEditingMap] = useState<string | null>(null);

  const loadMaps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMaps();
      setMaps(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load maps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaps();
  }, []);

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the map '${name}'? This will also delete all associated waypoints.`)) {
      return;
    }
    try {
      await deleteMap(name);
      await loadMaps();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete map');
    }
  };

  return (
    <div className="min-h-[calc(100vh-57px)] bg-slate-950">
      {editingMap && (
        <MapEditor
          mapName={editingMap}
          onClose={() => setEditingMap(null)}
        />
      )}

      <div className="mx-auto max-w-4xl p-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl">
          <h2 className="mb-2 text-2xl font-bold text-white">Saved Maps</h2>
          <p className="text-sm text-slate-400">
            View, edit, and manage your saved maps
          </p>
        </div>

        {/* Connection status */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-6 py-4 shadow-lg">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            System Status
          </div>
          <ConnectionStatus />
        </div>

        {/* Maps list */}
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 py-12">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm">Loading maps...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-6 py-4 text-red-400">
            Error: {error}
          </div>
        ) : maps.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 py-12">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <svg className="h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No maps saved yet</p>
              <p className="text-xs">Start mapping to create your first map</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {maps.map((map) => (
              <div
                key={map.name}
                className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/50 p-4 shadow-lg hover:border-slate-600 transition-colors"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h3 className="font-semibold text-white">{map.name}</h3>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>
                      Resolution: <span className="font-mono font-semibold">{map.resolution.toFixed(3)} m/px</span>
                    </div>
                    <div>
                      Origin: <span className="font-mono font-semibold">[{map.origin.map(x => x.toFixed(2)).join(', ')}]</span>
                    </div>
                    <div>
                      Created: <span className="font-mono">{new Date(map.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingMap(map.name)}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-500 transition-colors"
                  >
                    Edit Map
                  </button>
                  <button
                    onClick={() => handleDelete(map.name)}
                    className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 border border-slate-600 shadow-md hover:bg-red-900 hover:text-white hover:border-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
