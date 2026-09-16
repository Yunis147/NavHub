import { useCallback, useEffect, useRef, useState } from 'react';
import { useRos } from '../services/ros';
import { publishTwist, publishZero, ZERO, type Twist2D } from '../services/cmdVel';
import { TELEOP_KEEPALIVE_HZ } from '../config';


const MAX_SPEED = 1.5;
const MIN_SPEED = 0.05;

export function useTeleop(canDrive: boolean) {
  const { ros, status } = useRos();
  const target = useRef<Twist2D>({ ...ZERO });
  const keepaliveId = useRef<number | null>(null);
  const live = status === 'connected' && canDrive;
  
  const [speed, setSpeedState] = useState(0.4);
  const [turn, setTurnState] = useState(0.8);

  const speedRef = useRef(0.4);
  const turnRef = useRef(0.8);

  const setSpeed = useCallback((s: number) => {
    const val = Math.min(MAX_SPEED, Math.max(MIN_SPEED, s));
    setSpeedState(val);
    speedRef.current = val;
  }, []);
  const setTurn = useCallback((t: number) => {
    const val = Math.min(MAX_SPEED * 2.5, Math.max(MIN_SPEED * 2.5, t));
    setTurnState(val);
    turnRef.current = val;
  }, []);

  const adjustSpeed = useCallback((delta: number) => {
    setSpeedState(s => {
      const val = parseFloat(Math.min(MAX_SPEED, Math.max(MIN_SPEED, s + delta)).toFixed(2));
      speedRef.current = val;
      return val;
    });
    setTurnState(t => {
      const val = parseFloat(Math.min(MAX_SPEED * 2.5, Math.max(MIN_SPEED * 2.5, t + (delta * 2.5))).toFixed(2));
      turnRef.current = val;
      return val;
    });
  }, []);

  const stopKeepalive = useCallback(() => {
    if (keepaliveId.current !== null) {
      window.clearInterval(keepaliveId.current);
      keepaliveId.current = null;
    }
  }, []);

  const zeroNow = useCallback(() => {
    stopKeepalive();
    target.current = { ...ZERO };
    if (ros && status === 'connected') publishZero(ros);
  }, [ros, status, stopKeepalive]);

  // A command is only allowed to remain latched while this browser has control.
  // Loss of that authority or ROS connection cancels any active command stream.
  useEffect(() => {
    if (!live || !ros) {
      zeroNow();
      return;
    }

    return stopKeepalive;
  }, [live, ros, stopKeepalive, zeroNow]);

  useEffect(() => {
    return () => {
      zeroNow();
    };
  }, [zeroNow]);

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
    if (!ros || status !== 'connected') return;

    publishTwist(ros, target.current);
    stopKeepalive();

    if (t.vx !== 0 || t.vy !== 0 || t.wz !== 0) {
      // Start the keepalive in the same path that just reached the robot. This
      // avoids depending on a later state render to make latched motion work.
      keepaliveId.current = window.setInterval(() => {
        publishTwist(ros, target.current);
      }, 1000 / TELEOP_KEEPALIVE_HZ);
    }
  }, [ros, status, stopKeepalive]);

  return { live, setTranslate, setTwist, stop: zeroNow, speed, turn, setSpeed, setTurn, adjustSpeed };
}
