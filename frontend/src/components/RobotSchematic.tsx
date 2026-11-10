import { useRos } from '../services/ros';
import { useTeleopContext } from '../contexts/TeleopContext';
import { PanelHeading } from './WorkspaceUI';

export function RobotSchematic() {
  const { status } = useRos();
  const teleop = useTeleopContext();
  return <section className="panel robot-overview">
    <PanelHeading icon="robot" title="Robot overview" trailing={<span className="micro-badge">XLE / 01</span>} />
    <div className="schematic-scene">
      <div className="schematic-label"><span className="status-dot" />TOP VIEW <span className="schematic-label-detail">BASE SCHEMATIC</span></div>
      <svg viewBox="0 0 640 390" className="robot-schematic" role="img" aria-label="Top-down schematic of the XLeRobot three-wheel omnidirectional base">
        <defs><linearGradient id="chassisFill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#29352b" /><stop offset="1" stopColor="#151e1a" /></linearGradient><linearGradient id="wheelFill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#343d35" /><stop offset="1" stopColor="#141b17" /></linearGradient></defs>
        <g fill="none" stroke="#26302a"><circle cx="320" cy="198" r="148" strokeDasharray="3 8" /><circle cx="320" cy="198" r="116" /><circle cx="320" cy="198" r="74" opacity=".5" /><path d="M320 33v330M155 198h330" strokeDasharray="3 7" /><path d="M202 80v15m-7-7h15M438 306v15m-7-7h15" /></g>
        <g fill="none" stroke="#90bc76" strokeWidth="1.5"><path d="M310 46l10-10 10 10M320 36v32" /><path d="M320 91 411 249q6 12-8 16H237q-14-4-8-16l81-148q10-17 10-10Z" fill="url(#chassisFill)" stroke="#536c48" /><path d="m320 112 72 136H248l72-136Z" stroke="#3e5239" /><path d="M320 145v29M271 236l27-17M368 236l-27-17" stroke="#648054" /></g>
        <g transform="translate(320 105)"><rect x="-31" y="-15" width="62" height="31" rx="7" fill="url(#wheelFill)" stroke="#788572" /><path d="M-23-11v22m9-22v22m9-22v22m10-22v22m9-22v22m9-22v22" stroke="#4e5c47" strokeWidth="4" /></g>
        <g transform="translate(238 256) rotate(-60)"><rect x="-31" y="-15" width="62" height="31" rx="7" fill="url(#wheelFill)" stroke="#788572" /><path d="M-23-11v22m9-22v22m9-22v22m10-22v22m9-22v22m9-22v22" stroke="#4e5c47" strokeWidth="4" /></g>
        <g transform="translate(402 256) rotate(60)"><rect x="-31" y="-15" width="62" height="31" rx="7" fill="url(#wheelFill)" stroke="#788572" /><path d="M-23-11v22m9-22v22m9-22v22m10-22v22m9-22v22m9-22v22" stroke="#4e5c47" strokeWidth="4" /></g>
        <g><circle cx="320" cy="198" r="34" fill="#111b14" stroke="#a6d680" /><circle cx="320" cy="198" r="26" fill="#283a22" stroke="#4d6b3c" /><circle cx="320" cy="198" r="17" fill="#141e12" stroke="#749858" /><circle cx="320" cy="198" r="6" fill="#b9f582" /><path d="M319 172v-8M319 232v-8M287 198h8M345 198h8" stroke="#b9f582" /></g>
        <g fill="#b9f582"><circle cx="277" cy="238" r="3" /><circle cx="363" cy="238" r="3" /><circle cx="320" cy="133" r="3" /></g>
        <g fill="none" stroke="#5d7252"><path d="M353 198h93l24-24h65" /><path d="M289 108h-89l-26-24H94" /><path d="M232 266h-52l-21 25H91" /><circle cx="353" cy="198" r="3" /><circle cx="289" cy="108" r="3" /><circle cx="232" cy="266" r="3" /></g>
        <g fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="1.2"><text x="472" y="164" fill="#c4d0bd">RPLIDAR</text><text x="472" y="186" fill="#71806a">360° SCANNING</text><text x="94" y="73" fill="#c4d0bd">OMNI BASE</text><text x="94" y="96" fill="#71806a">3 × ST3215</text><text x="92" y="316" fill="#9cad90">LATERAL DRIVE</text><text x="305" y="24" fill="#9cad90">+X</text><text x="488" y="202" fill="#71806a">−Y</text></g>
      </svg>
      <div className="schematic-footer"><span><span className={`status-dot ${status === 'connected' ? 'connected' : ''}`} />{status === 'connected' ? 'ROS bridge connected' : 'Awaiting robot connection'}</span><span>REP-103 FRAME</span></div>
    </div>
    <div className="robot-metrics"><div><span>Linear speed setting</span><strong>{teleop.speed.toFixed(2)} <small>m/s</small></strong></div><div><span>Angular speed setting</span><strong>{teleop.turn.toFixed(2)} <small>rad/s</small></strong></div><div><span>Drive configuration</span><strong>3 <small>omni wheels</small></strong></div></div>
  </section>;
}
