import { ROBOT } from '../config/robot.js';
import * as procs from './processManager.js';

// Start `ros2 launch <pkg> <file>` inside a shell that first sources ROS + the workspace
// overlay, so a launch works whether or not the backend was started from a sourced shell
// (systemd, Phase 6). `exec` replaces the shell with ros2 so ros2 is the process-group
// leader — Rule 11's group-kill in processManager then tears down the whole node tree.
// stdio is inherited (see processManager), so launch logs/errors surface in the backend console.
export function launch(name, pkg, file) {
  const cmd = [
    `source '${ROBOT.rosSetup}'`,
    `source '${ROBOT.wsSetup}'`,
    `exec ros2 launch ${pkg} ${file}`,
  ].join(' && ');
  return procs.start(name, 'bash', ['-c', cmd]);
}
