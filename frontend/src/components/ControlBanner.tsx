import type { ServerState } from '../services/api';
import { Icon } from './Icon';
import { PanelHeading } from './WorkspaceUI';

export function ControlBanner({ hasControl, server, error, onTake, onRelease }: {
  hasControl: boolean;
  server: ServerState;
  error: string | null;
  onTake: () => void;
  onRelease: () => void;
}) {
  const heldByOther = server.controlled && !hasControl;
  return <section className="panel control-panel">
    <PanelHeading icon="shield" title="Operator access" trailing={<span className={`micro-badge ${hasControl ? 'accent' : ''}`}>{hasControl ? 'IN CONTROL' : 'OBSERVER'}</span>} />
    <div className="panel-body">
      <div className="control-state"><span className={`status-dot ${hasControl ? 'connected' : heldByOther ? 'connecting' : ''}`} /><strong>{hasControl ? 'You have control' : heldByOther ? 'Control held by another operator' : 'Ready when you are'}</strong></div>
      <p className="muted-text">{hasControl ? 'This browser holds the robot control session.' : heldByOther ? 'Wait for the current operator to release control.' : 'Take control to enable robot commands.'}</p>
      <button type="button" onClick={hasControl ? onRelease : onTake} disabled={heldByOther} className={`button full-width ${hasControl ? 'secondary' : 'primary'}`}><Icon name={hasControl ? 'shield' : 'control'} size={17} />{hasControl ? 'Release Control' : 'Take Control'}{!hasControl && <Icon name="arrow" size={16} />}</button>
      <div className="control-meta"><span>Operation mode</span><span className="mode-label"><span className={`status-dot ${server.mode !== 'idle' ? 'connected' : ''}`} />{server.mode}</span></div>
      {!server.teleopAllowed && <p className="inline-warning">Teleoperation is unavailable in this mode.</p>}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </div>
  </section>;
}
