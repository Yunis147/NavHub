import { useCallback } from 'react';
import { useRos } from '../services/ros';
import { useControlContext } from '../contexts/ControlContext';
import { useServerState } from '../hooks/useServerState';
import { useTeleopContext } from '../contexts/TeleopContext';
import { ControlBanner } from '../components/ControlBanner';
import { WASDControls } from '../components/WASDControls';
import { TeleopInstructions } from '../components/TeleopInstructions';
import { EStopButton } from '../components/EStopButton';
import { RobotSchematic } from '../components/RobotSchematic';
import { PageHeading, RobotConnectionNotice } from '../components/WorkspaceUI';
import { KeyboardTeleop } from '../components/KeyboardTeleop';

export default function TeleopPage() {
  const { status } = useRos();
  const server = useServerState();
  const { hasControl, take, give, error } = useControlContext();

  const canDrive = hasControl && server.teleopAllowed && status === 'connected';
  const teleop = useTeleopContext();

  const onEStop = useCallback(() => {
    teleop.stop();
    void give();
  }, [teleop, give]);

  return (
    <div className="workspace-page teleop-page">
      <KeyboardTeleop enabled={canDrive} onTwist={teleop.setTwist} onStop={teleop.stop} speed={teleop.speed} turn={teleop.turn} onSpeedAdjust={teleop.adjustSpeed} />
      <PageHeading eyebrow="MANUAL OPERATIONS" title="You're in the driver's seat" description="Precise control. In every direction. Right from your browser.">
        <span className="workspace-tag"><span className={`status-dot ${canDrive ? 'connected' : ''}`} />{canDrive ? 'READY TO DRIVE' : 'STANDBY'}</span>
      </PageHeading>
      <RobotConnectionNotice />
      <div className="teleop-layout">
        <div className="teleop-overview"><RobotSchematic /><TeleopInstructions /></div>
        <div className="teleop-controls">
          <EStopButton onStop={onEStop} />
          <ControlBanner hasControl={hasControl} server={server} error={error} onTake={() => void take()} onRelease={() => void give()} />
          <WASDControls enabled={canDrive} />
        </div>
      </div>
      <div className="workspace-footnote"><span>Built for XLeRobot</span><span>Local network · Single operator · ROS 2 Jazzy</span></div>
    </div>
  );
}
