import type { WaypointInfo } from '../services/api';
import { Icon } from './Icon';
import { EmptyState, PanelHeading } from './WorkspaceUI';

interface WaypointPanelProps {
  waypoints: WaypointInfo[];
  recording: boolean;
  name: string;
  canRecord: boolean;
  showRecord: boolean;
  onRecord: () => void;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onDispatch?: (waypoint: WaypointInfo) => void;
}

export function WaypointPanel({ waypoints, recording, name, canRecord, showRecord, onRecord, onNameChange, onSave, onCancel, onDelete, onDispatch }: WaypointPanelProps) {
  return <section className="panel">
    <PanelHeading icon="pin" title="Saved waypoints" trailing={showRecord && !recording ? <button type="button" className="button secondary waypoint-go" onClick={onRecord} disabled={!canRecord}><Icon name="plus" size={13} />Record Here</button> : <span className="micro-badge">{waypoints.length} POINTS</span>} />
    <div className="panel-body">
      {recording && <div className="waypoint-form"><p>Name the robot's current position.</p><label className="field-label" htmlFor="waypoint-name">Waypoint name</label><input autoFocus id="waypoint-name" type="text" className="field-input" placeholder="e.g. charging_station" value={name} onChange={e => onNameChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSave(); }} /><div className="waypoint-form-buttons"><button type="button" className="button primary" onClick={onSave}>Save point</button><button type="button" className="button secondary" onClick={onCancel}>Cancel</button></div></div>}
      {waypoints.length === 0 && !recording ? <EmptyState icon="pin" title="Places worth remembering" description={showRecord ? 'Drive to a location and record it as a waypoint.' : 'Record points in the Waypoints workspace to send the robot there.'} /> : <div className="waypoint-list">{waypoints.map(waypoint => <div className="waypoint-item" key={waypoint.id}><div><strong>{waypoint.name}</strong><button type="button" onClick={() => onDelete(waypoint.id)} className="icon-button" title={`Delete waypoint ${waypoint.name}`} aria-label={`Delete waypoint ${waypoint.name}`}><Icon name="trash" size={13} /></button></div><div className="waypoint-coordinates"><span>{waypoint.x.toFixed(2)}, {waypoint.y.toFixed(2)} m · {(waypoint.yaw * 180 / Math.PI).toFixed(0)}°</span>{onDispatch && <button type="button" className="button primary waypoint-go" onClick={() => onDispatch(waypoint)}>Go<Icon name="arrow" size={12} /></button>}</div></div>)}</div>}
    </div>
  </section>;
}
