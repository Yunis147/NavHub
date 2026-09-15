import ROSLIB from 'roslib';
import { CMD_VEL_TOPIC } from '../config';

export interface Twist2D {
  vx: number; // linear.x  (+forward)
  vy: number; // linear.y  (+left, ROS REP-103)
  wz: number; // angular.z (+ccw)
}

export const ZERO: Twist2D = { vx: 0, vy: 0, wz: 0 };

// One Topic per Ros instance; roslib warns on repeated advertise.
const topics = new WeakMap<ROSLIB.Ros, ROSLIB.Topic>();

function cmdVel(ros: ROSLIB.Ros): ROSLIB.Topic {
  let t = topics.get(ros);
  if (!t) {
    t = new ROSLIB.Topic({ ros, name: CMD_VEL_TOPIC, messageType: 'geometry_msgs/msg/Twist' });
    topics.set(ros, t);
  }
  return t;
}

export function publishTwist(ros: ROSLIB.Ros, { vx, vy, wz }: Twist2D): void {
  cmdVel(ros).publish(
    new ROSLIB.Message({
      linear: { x: vx, y: vy, z: 0 },
      angular: { x: 0, y: 0, z: wz },
    }),
  );
}

export function publishZero(ros: ROSLIB.Ros): void {
  publishTwist(ros, ZERO);
}
