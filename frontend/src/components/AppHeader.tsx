import { useLocation } from 'react-router-dom';
import { useControlContext } from '../contexts/ControlContext';
import { ConnectionStatus } from './ConnectionStatus';
import { Icon } from './Icon';

const names: Record<string, string> = { '/teleop': 'Teleoperation', '/mapping': 'Live mapping', '/points': 'Waypoints', '/navigation': 'Navigation', '/maps': 'Map library' };

export function AppHeader() {
  const { pathname } = useLocation();
  const { hasControl } = useControlContext();
  return <header className="app-header"><div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" size={13} /><strong>{names[pathname] || 'Teleoperation'}</strong></div><div className="app-header-status"><span className="session-status"><Icon name="shield" size={14} />{hasControl ? 'Operator control' : 'Observer mode'}</span><span className="header-divider" /><ConnectionStatus /><span className="operator-avatar" title="Local operator">OP</span></div></header>;
}
