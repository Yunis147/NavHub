import { Icon } from './Icon';
import { PanelHeading } from './WorkspaceUI';

export function TeleopInstructions() {
  const shortcuts = [{ keys: ['W', 'S'], label: 'Forward / backward' }, { keys: ['A', 'D'], label: 'Strafe left / right' }, { keys: ['Q', 'E'], label: 'Rotate left / right' }, { keys: ['X'], label: 'Stop motion' }];
  return <section className="panel keyboard-panel"><PanelHeading icon="keyboard" title="Keyboard shortcuts" trailing={<span className="micro-badge">WASD + QE</span>} /><div className="shortcut-list">{shortcuts.map(shortcut => <div className="shortcut-row" key={shortcut.label}><div>{shortcut.keys.map(key => <kbd key={key} className={key === 'X' ? 'danger-key' : ''}>{key}</kbd>)}</div><span>{shortcut.label}</span></div>)}</div><div className="keyboard-footnote"><Icon name="info" size={15} /><p>Commands stay active until you press another direction or X. Use <kbd>−</kbd> / <kbd>+</kbd> to adjust speed.</p></div></section>;
}
