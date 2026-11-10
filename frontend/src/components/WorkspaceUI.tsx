import type { ReactNode } from 'react';
import { useRos } from '../services/ros';
import { Icon, type IconName } from './Icon';

export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}<span className="heading-dot">.</span></h1><p>{description}</p></div>{children && <div className="heading-actions">{children}</div>}</header>;
}

export function PanelHeading({ icon, title, trailing }: { icon: IconName; title: string; trailing?: ReactNode }) {
  return <div className="panel-heading"><div><Icon name={icon} size={17} /><h2>{title}</h2></div>{trailing}</div>;
}

export function RobotConnectionNotice() {
  const { status } = useRos();
  if (status === 'connected') return null;
  return <div className="connection-notice" role="status"><Icon name="offline" size={18} /><div><strong>Robot connection unavailable</strong><span>Controls activate when the robot is connected and you have control.</span></div><span className="notice-tag">AWAITING CONNECTION</span></div>;
}

export function EmptyState({ icon, title, description, children }: { icon: IconName; title: string; description: string; children?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={26} /></div><h3>{title}</h3><p>{description}</p>{children}</div>;
}

export function ViewerEmptyState({ kind }: { kind: 'mapping' | 'navigation' }) {
  const { status } = useRos();
  return <div className="viewer-empty" aria-live="polite"><div className="radar-mark"><div /><div /><Icon name={kind === 'mapping' ? 'scan' : 'route'} size={31} /></div><span className="eyebrow">{status === 'connected' ? 'READY FOR YOUR NEXT MISSION' : 'NO LIVE DATA'}</span><h3>{kind === 'mapping' ? 'Your environment, mapped.' : 'Your next destination starts here.'}</h3><p>{kind === 'mapping' ? 'Start a mapping session and explore. Your map will build here in real time.' : 'Load a saved map to localize the robot and plan its next move.'}</p><div className="viewer-empty-steps"><span><i>01</i> {status === 'connected' ? 'Take control' : 'Connect robot'}</span><Icon name="chevron" size={13} /><span><i>02</i> {kind === 'mapping' ? 'Start mapping' : 'Load map'}</span><Icon name="chevron" size={13} /><span><i>03</i> {kind === 'mapping' ? 'Explore' : 'Set initial pose'}</span></div></div>;
}
