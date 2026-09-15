import { useCallback, useEffect, useRef } from 'react';
import { useRos } from '../services/ros';
import { publishTwist, publishZero, ZERO, type Twist2D } from '../services/cmdVel';
import { PUBLISH_HZ } from '../config';

// Owns the /cmd_vel publish loop and the client half of the deadman (Rule 9).
// While `canDrive`, publishes the current target at PUBLISH_HZ. The instant driving
// should stop — control lost, disconnect, tab hidden/blurred, unmount — it publishes
// an explicit zero (when still connected) and stops the loop. The robot-side rclpy
// watchdog is the backstop for the cases where we can't send anything (crash/wifi).
export function useTeleop(canDrive: boolean) {
  const { ros, status } = useRos();
  const target = useRef<Twist2D>({ ...ZERO });
  const live = status === 'connected' && canDrive;

  const zeroNow = useCallback(() => {
    target.current = { ...ZERO };
    if (ros && status === 'connected') publishZero(ros);
  }, [ros, status]);

  // Publish loop, active only while live. Cleanup sends one final zero.
  useEffect(() => {
    if (!ros || !live) return;
    const id = setInterval(() => publishTwist(ros, target.current), 1000 / PUBLISH_HZ);
    return () => {
      clearInterval(id);
      if (status === 'connected') publishZero(ros);
    };
  }, [ros, live, status]);

  // Safety: zero if the operator's attention leaves the tab.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) zeroNow();
    };
    window.addEventListener('blur', zeroNow);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('blur', zeroNow);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [zeroNow]);

  const setTranslate = useCallback((vx: number, vy: number) => {
    target.current = { ...target.current, vx, vy };
  }, []);
  const setTwist = useCallback((t: Twist2D) => {
    target.current = { ...t };
    if (ros && status === 'connected') publishTwist(ros, target.current);
  }, [ros, status]);

  return { live, setTranslate, setTwist, stop: zeroNow };
}
