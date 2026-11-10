import { useRos } from '../services/ros';

export function ConnectionStatus() {
  const { status, url } = useRos();
  return <div className={`connection-status ${status}`} title={url} role="status"><span className={`status-dot ${status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : ''}`} /><span>{status === 'connected' ? 'Robot connected' : status === 'connecting' ? 'Connecting…' : 'Robot offline'}</span></div>;
}
