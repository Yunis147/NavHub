import { NavLink } from 'react-router-dom';
import { useRos } from '../services/ros';
import { Icon, type IconName } from './Icon';

const links: { to: string; label: string; icon: IconName; number: string }[] = [
  { to: '/teleop', label: 'Teleoperation', icon: 'control', number: '01' },
  { to: '/mapping', label: 'Live mapping', icon: 'scan', number: '02' },
  { to: '/points', label: 'Waypoints', icon: 'pin', number: '03' },
  { to: '/navigation', label: 'Navigation', icon: 'route', number: '04' },
  { to: '/maps', label: 'Map library', icon: 'layers', number: '05' },
];

export function Navbar() {
  const { status } = useRos();
  return <aside className="app-sidebar">
    <NavLink to="/teleop" className="brand" aria-label="NavHub home">
      <div className="brand-symbol"><svg width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m6 25 9-19h3l8 19h-6l-4-10-4 10H6Z" fill="currentColor" /><path d="M6 17h20" stroke="#b9f582" strokeWidth="2" /></svg></div>
      <div><span className="brand-name">navhub<span>®</span></span><span className="brand-description">ROBOT MISSION CONTROL</span></div>
    </NavLink>
    <div className="sidebar-section-label">WORKSPACE</div>
    <nav className="sidebar-links" aria-label="Main navigation">{links.map(link => <NavLink key={link.to} to={link.to} className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}><Icon name={link.icon} size={19} /><span>{link.label}</span><small>{link.number}</small></NavLink>)}</nav>
    <div className="sidebar-bottom">
      <div className="robot-card"><div className="robot-card-top"><div className="robot-card-icon"><Icon name="robot" size={23} /></div><span className={`status-dot ${status === 'connected' ? 'connected' : ''}`} /></div><strong>XLeRobot</strong><span>Omnidirectional mobile base</span><div className="robot-card-tags"><span>ROS 2 JAZZY</span><span>3-WHEEL OMNI</span></div></div>
      <div className="sidebar-footer"><span className="status-dot" /><span>NavHub <b>v0.1</b></span><span className="local-tag">LOCAL</span></div>
    </div>
  </aside>;
}
