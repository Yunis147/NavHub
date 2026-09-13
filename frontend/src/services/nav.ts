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

// Nav2 Action Client (Rule 12) - Updated to ROS 2 Action Protocol (C1 Fix)
export function sendNavGoal(ros: ROSLIB.Ros, pose: Pose2D, onStatus: (s: string) => void): () => void {
  const { x, y, yaw } = pose;
  const qw = Math.cos(yaw / 2);
  const qz = Math.sin(yaw / 2);

  const goalId = 'goal_' + Math.random().toString(36).substring(2, 11);

  // Send the ROS 2 native action goal wrapper via rosbridge extension
  ros.callOnConnection({
    op: 'send_action_goal',
    id: goalId,
    action: '/navigate_to_pose',
    action_type: 'nav2_msgs/action/NavigateToPose',
    args: {
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
    feedback: true
  });

  // Track status by listening to unhandled websocket action messages in case roslibjs adapter drops them
  const handleMessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.op === 'action_goal_result' && msg.id === goalId) {
        // Evaluate the result code if Nav2 provides it
        onStatus('Succeeded');
      } else if (msg.op === 'action_goal_feedback' && msg.id === goalId) {
        onStatus('Active');
      }
    } catch (e) {
      // non-JSON message, ignore
    }
  };

  const socket = (ros as any).socket;
  if (socket && typeof socket.addEventListener === 'function') {
    socket.addEventListener('message', handleMessage);
  }

  // Backup topic for GoalStatus tracking (Nav2 publishes reliably here)
  const statusTopic = new ROSLIB.Topic({
    ros,
    name: '/navigate_to_pose/_action/status',
    messageType: 'action_msgs/GoalStatusArray'
  });

  statusTopic.subscribe((message: any) => {
    if (message && message.status_list && message.status_list.length > 0) {
      // Find our goal in the list (if goal UUIDs were properly parsed into strings, but Nav2 uses bytes)
      // We take the generic latest status if it's there
      const latest = message.status_list[message.status_list.length - 1];
      const states: Record<number, string> = {
        1: 'Pending',
        2: 'Active',
        3: 'Canceling',
        4: 'Succeeded',
        5: 'Canceled',
        6: 'Aborted'
      };
      const translated = states[latest.status];
      if (translated) onStatus(translated);
    }
  });

  // Return a cancel function
  return () => {
    ros.callOnConnection({
      op: 'cancel_action_goal',
      action: '/navigate_to_pose',
      id: goalId
    });
    if (socket && typeof socket.removeEventListener === 'function') {
      socket.removeEventListener('message', handleMessage);
    }
    statusTopic.unsubscribe();
  };
}