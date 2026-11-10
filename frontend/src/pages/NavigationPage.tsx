import { useCallback, useEffect, useState, useRef } from 'react';
import { useRos } from '../services/ros';
import { useControlContext } from '../contexts/ControlContext';
import { useServerState } from '../hooks/useServerState';
import { useTeleopContext } from '../contexts/TeleopContext';
import { useSlamMap } from '../hooks/useSlamMap';
import { startNavigation, stopNavigation, listMaps, type MapInfo, listWaypoints, saveWaypoint, deleteWaypoint, type WaypointInfo } from '../services/api';
import { publishInitialPose, sendNavGoal } from '../services/nav';
import type { Pose2D } from '../lib/tf2d';
import { ControlBanner } from '../components/ControlBanner';
import { EStopButton } from '../components/EStopButton';
import { PageHeading, PanelHeading, RobotConnectionNotice } from '../components/WorkspaceUI';
import { Icon } from '../components/Icon';
import { WaypointPanel } from '../components/WaypointPanel';
// We will build a NavViewer component shortly
import { NavViewer } from '../components/NavViewer';


// Navigation UI
export default function NavigationPage() {
  const { ros } = useRos();
  const server = useServerState();
  const { hasControl, token, take, give, error } = useControlContext();

  // We reuse useSlamMap for the active grid and robot TF
  const { grid, robotPose } = useSlamMap(ros);

  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  const [waypoints, setWaypoints] = useState<WaypointInfo[]>([]);
  const [recordingWaypoint, setRecordingWaypoint] = useState(false);
  const [newWaypointName, setNewWaypointName] = useState('');

  const navigating = server.mode === 'navigating';
  const teleop = useTeleopContext();
  

  // Load maps on mount
  useEffect(() => {
    listMaps().then(data => {
      setMaps(data);
      if (data.length > 0 && !selectedMap) setSelectedMap(data[0].name);
    }).catch(console.error);
  }, []);

  // Load waypoints when map changes
  useEffect(() => {
    if (selectedMap) {
      listWaypoints(selectedMap).then(setWaypoints).catch(console.error);
    } else {
      setWaypoints([]);
    }
  }, [selectedMap]);

  const handleRecordWaypoint = async () => {
    if (!selectedMap || !robotPose || !newWaypointName.trim()) return;
    try {
      await saveWaypoint(selectedMap, newWaypointName.trim(), robotPose.x, robotPose.y, robotPose.yaw);
      setNewWaypointName('');
      setRecordingWaypoint(false);
      // Reload waypoints
      const w = await listWaypoints(selectedMap);
      setWaypoints(w);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'failed to save waypoint');
    }
  };

  const handleDeleteWaypoint = async (id: string) => {
    if (!selectedMap) return;
    try {
      await deleteWaypoint(selectedMap, id);
      const w = await listWaypoints(selectedMap);
      setWaypoints(w);
    } catch(e) {
      console.error(e);
    }
  };

  const handleDispatchWaypoint = (wp: WaypointInfo) => {
    handleSetGoalPose(wp);
  };

  const onEStop = useCallback(() => {
    // Rule 6: E-Stop must cancel goal AND zero velocity AND kill Nav2 process tree.
    // A single zero /cmd_vel is overwritten within ~50ms by Nav2's collision_monitor,
    // so we must also kill the Nav2 process (stopNavigation) to truly halt the robot.
    teleop.stop();
    if (cancelGoalRef.current) {
      cancelGoalRef.current();
      cancelGoalRef.current = null;
    }
    // Kill the Nav2 process tree (Rule 11 group kill) — this is the real stop mechanism.
    // Even if the action cancel above is a no-op (C1), this guarantees the robot halts.
    void stopNavigation();
    setNavGoalStatus('EMERGENCY STOP');
    void give();
  }, [teleop, give]);

  const handleStart = async () => {
    if (!token || !selectedMap) return;
    setBusy(true);
    setNavError(null);
    try {
      await startNavigation(token, selectedMap);
    } catch (e) {
      setNavError(e instanceof Error ? e.message : 'failed to start navigation');
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    setNavError(null);
    try {
      await stopNavigation();
    } finally {
      setBusy(false);
    }
  };

  // Nav modes for clicking on the canvas
  const [interactMode, setInteractMode] = useState<'view' | 'initial_pose' | 'goal_pose'>('view');
  const [navGoalStatus, setNavGoalStatus] = useState<string | null>(null);
  const cancelGoalRef = useRef<(() => void) | null>(null);

  const handleSetInitialPose = useCallback((pose: Pose2D) => {
    if (ros && navigating) {
      publishInitialPose(ros, pose);
      setInteractMode('view');
    }
  }, [ros, navigating]);

  const handleSetGoalPose = useCallback((pose: Pose2D) => {
    if (ros && navigating) {
      // Cancel existing if any
      if (cancelGoalRef.current) cancelGoalRef.current();

      const cancel = sendNavGoal(ros, pose, (status) => {
        setNavGoalStatus(status);
        if (['Succeeded', 'Aborted', 'Canceled'].includes(status)) {
          // keep track
        }
      });
      cancelGoalRef.current = cancel;
      setNavGoalStatus('Sending...');
      setInteractMode('view');
    }
  }, [ros, navigating]);

  return (
    <div className="workspace-page mission-page">
      <PageHeading eyebrow="AUTONOMOUS OPERATIONS" title="A clear path forward" description="Localize your robot. Choose a destination. Let navigation take over.">
        <span className="workspace-tag"><span className={`status-dot ${navigating ? 'connected' : ''}`} />{navigating ? 'NAV2 ACTIVE' : 'NAV2 STANDBY'}</span>
      </PageHeading>
      <RobotConnectionNotice />
      <div className="mission-layout">
        <div className="mission-view panel viewport-panel">
          <PanelHeading icon="route" title="Navigation workspace" trailing={<span className="micro-badge">2D · MAP FRAME</span>} />
          <div className="viewport-body"><NavViewer grid={grid} robotPose={robotPose} interactMode={interactMode} onSetInitialPose={handleSetInitialPose} onSetGoalPose={handleSetGoalPose} /></div>
          <div className="viewport-footer"><div className="viewport-legend"><span><i className="legend-swatch free" />Free space</span><span><i className="legend-swatch obstacle" />Obstacle</span><span><i className="legend-swatch robot" />Robot</span></div><span>{selectedMap ? selectedMap.toUpperCase() : 'NO MAP SELECTED'}</span></div>
        </div>
        <div className="mission-sidebar">
          <EStopButton onStop={onEStop} />
          <ControlBanner hasControl={hasControl} server={server} error={error} onTake={() => void take()} onRelease={() => void give()} />
          <section className="panel">
            <PanelHeading icon="map" title="Mission setup" trailing={<span className={`micro-badge ${navigating ? 'accent' : ''}`}>{navigating ? 'ACTIVE' : 'IDLE'}</span>} />
            <div className="panel-body">
              <div className="process-status"><span className={`status-dot ${navigating ? 'connected' : ''}`} /><strong>{navigating ? 'Nav2 Active' : 'Choose your environment'}</strong></div>
              <p className="muted-text">Load a saved map, then set the initial pose to localize the robot.</p>
              {!navigating && <><label className="field-label" htmlFor="mission-map">Saved map</label><select id="mission-map" value={selectedMap} onChange={e => setSelectedMap(e.target.value)} disabled={busy || maps.length === 0} className="field-input">{maps.length === 0 && <option value="">No maps available</option>}{maps.map(map => <option key={map.name} value={map.name}>{map.name}</option>)}</select></>}
              {navigating ? <button type="button" onClick={() => void handleStop()} disabled={busy} className="button secondary full-width"><Icon name="stop" size={15} />Stop Navigation</button> : <button type="button" onClick={() => void handleStart()} disabled={!hasControl || server.mode !== 'idle' || busy || !selectedMap} className="button primary full-width"><Icon name="route" size={16} />{busy ? 'Starting…' : 'Start Nav2'}</button>}
              {navError && <p className="inline-error" role="alert">{navError}</p>}
            </div>
          </section>
          {navigating && <section className="panel"><PanelHeading icon="target" title="Map interaction" /><div className="panel-body"><div className="interaction-buttons"><button type="button" aria-pressed={interactMode === 'view'} onClick={() => setInteractMode('view')} className={`interaction-button ${interactMode === 'view' ? 'selected' : ''}`}><Icon name="eye" size={16} />View Only</button><button type="button" aria-pressed={interactMode === 'initial_pose'} onClick={() => setInteractMode('initial_pose')} className={`interaction-button ${interactMode === 'initial_pose' ? 'selected' : ''}`}><Icon name="pin" size={16} />Set Initial Pose</button>
            <button type="button" aria-pressed={interactMode === 'goal_pose'} onClick={() => setInteractMode('goal_pose')} className={`interaction-button ${interactMode === 'goal_pose' ? 'selected' : ''}`}><Icon name="target" size={16} />Send Nav Goal</button>
          </div><p className="muted-text" style={{ marginBottom: 0 }}>Select a tool, then click and drag on the map to set position and heading.</p>{navGoalStatus && <p role="status" className={['Aborted', 'EMERGENCY STOP'].includes(navGoalStatus) ? 'inline-error' : navGoalStatus === 'Succeeded' ? 'inline-success' : 'inline-warning'}>{navGoalStatus}</p>}</div></section>}
          {navigating && <WaypointPanel waypoints={waypoints} recording={recordingWaypoint} name={newWaypointName} canRecord={!!robotPose} showRecord={false} onRecord={() => setRecordingWaypoint(true)} onNameChange={setNewWaypointName} onSave={() => void handleRecordWaypoint()} onCancel={() => { setRecordingWaypoint(false); setNewWaypointName(''); }} onDelete={id => void handleDeleteWaypoint(id)} onDispatch={handleDispatchWaypoint} />}
          {!navigating && <section className="panel"><PanelHeading icon="route" title="Before you navigate" /><div className="panel-body"><ol className="mission-steps"><li><span>01</span>Take control and load a saved map</li><li><span>02</span>Set the robot's initial pose</li><li><span>03</span>Click a goal or dispatch a waypoint</li></ol></div></section>}
        </div>
      </div>
    </div>
  );
}
