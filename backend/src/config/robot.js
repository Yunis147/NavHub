import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Single source of truth for ROS wiring the backend cares about. Topic names and
// timings that the frontend also needs are duplicated in frontend/src/config.ts
// (different runtime) — keep them in sync by hand; there are only a few.
export const ROBOT = {
  // rosbridge_server the browser connects to (started by start_navhub.sh, Phase 6).
  // Bound on the Pi; browsers reach it at ws://<pi-host>:9090.
  rosbridgePort: 9090,

  topics: {
    cmdVel: '/cmd_vel',
  },

  // Deadman node (Rule 9). Spawned by the process manager when ROS is sourced.
  watchdog: {
    script: resolve(__dirname, '../../ros/cmd_vel_watchdog.py'),
    // must match the constant inside cmd_vel_watchdog.py; informational here.
    timeoutSeconds: 0.5,
  },

  // SLAM mapping launch (Phase 2): `ros2 launch nav2 slam.py`, torn down as a tree (Rule 11).
  slam: { procName: 'slam', package: 'nav2', launchFile: 'slam.py' },

  // roslaunch.js sources these before `ros2 launch`, so launches work regardless of how the
  // backend itself was started (sourced shell, or systemd in Phase 6). Overridable for odd setups.
  rosSetup: process.env.ROS_SETUP || `/opt/ros/${process.env.ROS_DISTRO || 'jazzy'}/setup.bash`,
  wsSetup: process.env.NAVHUB_WS_SETUP || resolve(__dirname, '../../../robot_ws/install/setup.bash'),
};
