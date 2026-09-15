import { useCallback, useEffect, useRef, useState } from 'react';
import { useRos } from '../services/ros';
import { publishTwist, publishZero, ZERO, type Twist2D } from '../services/cmdVel';
import { PUBLISH_HZ } from '../config';


const MAX_SPEED = 1.5;
const MIN_SPEED = 0.05;

// Owns the /cmd_vel publish loop and the client half of the deadman (Rule 9).
export function useTeleop(canDrive: boolean) {
  const { ros, status } = useRos();
  const target = useRef<Twist2D>({ ...ZERO });
  const live = status === 'connected' && canDrive;
  
  const [speed, setSpeedState] = useState(0.4);
  const [turn, setTurnState] = useState(0.8);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(Math.min(MAX_SPEED, Math.max(MIN_SPEED, s)));
  }, []);
  const setTurn = useCallback((t: number) => {
    setTurnState(Math.min(MAX_SPEED * 2.5, Math.max(MIN_SPEED * 2.5, t)));
  }, []);

  const adjustSpeed = useCallback((delta: number) => {
    setSpeedState(s => parseFloat(Math.min(MAX_SPEED, Math.max(MIN_SPEED, s + delta)).toFixed(2)));
    setTurnState(t => parseFloat(Math.min(MAX_SPEED * 2.5, Math.max(MIN_SPEED * 2.5, t + (delta * 2.5))).toFixed(2)));
  }, []);

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

  return { live, setTranslate, setTwist, stop: zeroNow, speed, turn, setSpeed, setTurn, adjustSpeed };
}
