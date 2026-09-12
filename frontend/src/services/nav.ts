import ROSLIB from 'roslib';
import type { Pose2D } from '../lib/tf2d';
import { MAP_FRAME } from '../config';

// Publish to /initialpose for AMCL
export function publishInitialPose(ros: ROSLIB.Ros, pose: Pose2D): void {
  const topic = new ROSLIB.Topic({
    ros,
    name: '/initialpose',
    messageType: 'geometry_msgs/PoseWithCovarianceStamped',
  });

  const { x, y, yaw } = pose;
  const qw = Math.cos(yaw / 2);
  const qz = Math.sin(yaw / 2);

  const msg = new ROSLIB.Message({
    header: {
      frame_id: MAP_FRAME,
      stamp: { secs: 0, nsecs: 0 },
    },
    pose: {
      pose: {
        position: { x, y, z: 0 },
        orientation: { x: 0, y: 0, z: qz, w: qw },
      },
      // Narrow covariance representing high confidence in the click
      covariance: [
        0.25, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.25, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.068,
      ],
    },
  });

  topic.publish(msg);
}

// Nav2 Action Client (Rule 12)
export function sendNavGoal(ros: ROSLIB.Ros, pose: Pose2D, onStatus: (s: string) => void): () => void {
  const actionClient = new ROSLIB.ActionClient({
    ros,
    serverName: '/navigate_to_pose',
    actionName: 'nav2_msgs/action/NavigateToPose',
  });

  const { x, y, yaw } = pose;
  const qw = Math.cos(yaw / 2);
  const qz = Math.sin(yaw / 2);

  const goal = new ROSLIB.Goal({
    actionClient,
    goalMessage: {
      pose: {
        header: {
          frame_id: MAP_FRAME,
          stamp: { secs: 0, nsecs: 0 },
        },
        pose: {
          position: { x, y, z: 0 },
          orientation: { x: 0, y: 0, z: qz, w: qw },
        },
      }
    },
  });

  goal.on('status', (status: any) => {
    // ROS 2 Action status constants
    // 1=ACCEPTED, 2=EXECUTING, 3=CANCELING, 4=SUCCEEDED, 5=CANCELED, 6=ABORTED
    const states: Record<number, string> = {
      1: 'Pending',
      2: 'Active',
      3: 'Canceling',
      4: 'Succeeded',
      5: 'Canceled',
      6: 'Aborted'
    };
    onStatus(states[status.status] || 'Unknown');
  });

  goal.on('result', (_result: any) => {
    // result comes when action finishes (success, abort, cancel)
  });

  goal.send();

  // Return a cancel function
  return () => { actionClient.cancel(); };
}
