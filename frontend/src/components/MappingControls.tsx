import { useState } from 'react';
import { Icon } from './Icon';
import { PanelHeading } from './WorkspaceUI';
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
    <div className="stack">
      <section className="panel">
        <PanelHeading icon="scan" title="Mapping session" trailing={<span className={`micro-badge ${mapping ? 'accent' : ''}`}>{mapping ? 'ACTIVE' : 'STANDBY'}</span>} />
        <div className="panel-body">
          <div className="process-status"><span className={`status-dot ${mapping ? 'connected' : ''}`} /><strong>{mapping ? 'SLAM Active' : 'Ready to explore'}</strong></div>
          <p className="muted-text">{mapping ? 'Drive around to build your map. New scans appear in real time.' : 'Build a map of your environment using live LiDAR scans.'}</p>
          {mapping ? <button type="button" onClick={() => void stop()} disabled={busy} className="button secondary full-width"><Icon name="stop" size={15} />Stop Mapping</button> : <button type="button" onClick={() => void start()} disabled={!hasControl || mode !== 'idle' || busy} className="button primary full-width"><Icon name="scan" size={16} />{busy ? 'Starting…' : 'Start Mapping'}</button>}
        </div>
      </section>
      {(mode === 'idle' || mapping) && <section className="panel">
        <PanelHeading icon="save" title="Save your environment" />
        <div className="panel-body">
          <label className="field-label" htmlFor="map-name">Map name</label>
          <input id="map-name" type="text" placeholder="e.g. ground_floor" value={mapName} onChange={e => setMapName(e.target.value)} disabled={busy} className="field-input" />
          <button type="button" onClick={() => void save()} disabled={!hasControl || !mapName.trim() || busy} className="button primary full-width"><Icon name="save" size={15} />{busy ? 'Working…' : 'Save Map'}</button>
          <p className="muted-text" style={{ marginBottom: 0 }}>Saved maps are ready to edit and use for navigation.</p>
          {saveSuccess && <p className="inline-success" role="status">Map saved successfully.</p>}
        </div>
      </section>}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </div>
  );
}
