import { useTeleopContext } from '../contexts/TeleopContext';
import { Icon, type IconName } from './Icon';
import { PanelHeading } from './WorkspaceUI';

const MOVE_BINDINGS: Record<string, [number, number, number]> = {
  w: [1, 0, 0], s: [-1, 0, 0], a: [0, 1, 0], d: [0, -1, 0], q: [0, 0, 1], e: [0, 0, -1],
};
const directions: { key: string; icon: IconName; label: string }[] = [
  { key: 'q', icon: 'rotateLeft', label: 'Rotate left' },
  { key: 'w', icon: 'up', label: 'Forward' },
  { key: 'e', icon: 'rotateRight', label: 'Rotate right' },
  { key: 'a', icon: 'left', label: 'Strafe left' },
  { key: 's', icon: 'down', label: 'Backward' },
  { key: 'd', icon: 'arrow', label: 'Strafe right' },
];

export function WASDControls({ enabled }: { enabled: boolean }) {
  const teleop = useTeleopContext();
  const command = (key: string) => {
    if (!enabled) return;
    if (key === 'x') teleop.stop();
    else if (MOVE_BINDINGS[key]) {
      const [x, y, w] = MOVE_BINDINGS[key];
      teleop.setTwist({ vx: x * teleop.speed, vy: y * teleop.speed, wz: w * teleop.turn });
    }
  };

  return <section className="panel drive-panel">
    <PanelHeading icon="control" title="Directional control" trailing={<span className={`micro-badge ${enabled ? 'accent' : ''}`}>{enabled ? 'ENABLED' : 'LOCKED'}</span>} />
    <div className="panel-body">
      <div className="drive-pad">{directions.map(direction => <button type="button" key={direction.key} className="direction-key" disabled={!enabled} title={`${direction.key.toUpperCase()}: ${direction.label}`} aria-label={`${direction.label} (${direction.key.toUpperCase()})`} onMouseDown={() => command(direction.key)} onTouchStart={e => { e.preventDefault(); command(direction.key); }} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); command(direction.key); } }}><Icon name={direction.icon} size={23} /><span>{direction.key.toUpperCase()}</span></button>)}<div /><button type="button" className="direction-key stop-key" disabled={!enabled} title="X: Stop motion" aria-label="Stop motion (X)" onMouseDown={() => command('x')} onTouchStart={e => { e.preventDefault(); command('x'); }} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); command('x'); } }}><Icon name="stop" size={20} /><span>X</span></button><div /></div>
      <p className="drive-hint">Press once to move. <kbd>X</kbd> to stop.</p>
      <div className="speed-control"><div><span>Linear speed</span><strong>{teleop.speed.toFixed(2)} <small>m/s</small></strong></div><div className="speed-buttons"><button type="button" disabled={!enabled} onClick={() => teleop.adjustSpeed(-0.1)} title="Reduce speed (-)" aria-label="Reduce speed"><Icon name="minus" size={15} /></button><button type="button" disabled={!enabled} onClick={() => teleop.adjustSpeed(0.1)} title="Increase speed (+)" aria-label="Increase speed"><Icon name="plus" size={15} /></button></div></div>
      <div className="turn-readout"><span>Angular speed</span><strong>{teleop.turn.toFixed(2)} <small>rad/s</small></strong></div>
    </div>
  </section>;
}
