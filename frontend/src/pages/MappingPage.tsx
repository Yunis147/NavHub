import { useCallback } from 'react';
import { useRos } from '../services/ros';
import { useControlContext } from '../contexts/ControlContext';
import { useServerState } from '../hooks/useServerState';
import { useTeleopContext } from '../contexts/TeleopContext';
import { useSlamMap } from '../hooks/useSlamMap';
import { ControlBanner } from '../components/ControlBanner';
import { MappingControls } from '../components/MappingControls';
import { MapViewer } from '../components/MapViewer';
import { EStopButton } from '../components/EStopButton';
import { PageHeading, PanelHeading, RobotConnectionNotice } from '../components/WorkspaceUI';
import { TeleopInstructions } from '../components/TeleopInstructions';

import { KeyboardTeleop } from '../components/KeyboardTeleop';

export default function MappingPage() {
  const { ros, status } = useRos();
  const server = useServerState();
  const { hasControl, token, take, give, error } = useControlContext();
  const { grid, robotPose } = useSlamMap(ros);

  const teleop = useTeleopContext();
  const canDrive = hasControl && server.teleopAllowed && status === 'connected';

  const onEStop = useCallback(() => {
    teleop.stop();
    void give();
  }, [teleop, give]);

  return (
    <div className="workspace-page mission-page">
      <KeyboardTeleop enabled={canDrive} onTwist={teleop.setTwist} onStop={teleop.stop} speed={teleop.speed} turn={teleop.turn} onSpeedAdjust={teleop.adjustSpeed} />
      <PageHeading eyebrow="ENVIRONMENT INTELLIGENCE" title="Make room for exploration" description="Turn your surroundings into a map. One scan at a time.">
        <span className="workspace-tag"><span className={`status-dot ${server.mode === 'mapping' ? 'connected' : ''}`} />{server.mode === 'mapping' ? 'MAPPING ACTIVE' : 'MAPPING STANDBY'}</span>
      </PageHeading>
      <RobotConnectionNotice />
      <div className="mission-layout">
        <div className="mission-view panel viewport-panel">
          <PanelHeading icon="map" title="Live occupancy map" trailing={<span className="micro-badge">2D · MAP FRAME</span>} />
          <div className="viewport-body"><MapViewer grid={grid} robotPose={robotPose} /></div>
          <div className="viewport-footer"><div className="viewport-legend"><span><i className="legend-swatch free" />Free space</span><span><i className="legend-swatch obstacle" />Obstacle</span><span><i className="legend-swatch robot" />Robot</span></div><span>{grid ? `${grid.info.width} × ${grid.info.height} PX` : 'AWAITING MAP'}</span></div>
        </div>
        <div className="mission-sidebar">
          <EStopButton onStop={onEStop} />
          <ControlBanner hasControl={hasControl} server={server} error={error} onTake={() => void take()} onRelease={() => void give()} />
          <MappingControls hasControl={hasControl} token={token} mode={server.mode} />
          {grid && <section className="panel"><PanelHeading icon="activity" title="Map telemetry" /><div className="panel-body info-grid"><div><span>Resolution</span><strong>{grid.info.resolution.toFixed(3)} m/px</strong></div><div><span>Dimensions</span><strong>{grid.info.width} × {grid.info.height}</strong></div>{robotPose && <><div><span>Position X</span><strong>{robotPose.x.toFixed(2)} m</strong></div><div><span>Position Y</span><strong>{robotPose.y.toFixed(2)} m</strong></div><div><span>Heading</span><strong>{(robotPose.yaw * 180 / Math.PI).toFixed(1)}°</strong></div></>}</div></section>}
          <TeleopInstructions />
        </div>
      </div>
    </div>
  );
}
