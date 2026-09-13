import { useEffect, useRef, useState } from 'react';
import ROSLIB from 'roslib';
import {
  MAP_TOPIC,
  TF_TOPIC,
  TF_STATIC_TOPIC,
  MAP_FRAME,
  ROBOT_FRAME,
  MAP_THROTTLE_MS,
} from '../config';
import { quatToYaw, resolvePose, type Pose2D, type TfTree } from '../lib/tf2d';

export interface OccupancyGrid {
  info: {
    width: number;
    height: number;
    resolution: number;
    origin: { position: { x: number; y: number } };
  };
  data: ArrayLike<number>; // -1 unknown, 0 free .. 100 occupied
}

interface TfMessage {
  transforms: Array<{
    header: { frame_id: string };
    child_frame_id: string;
    transform: {
      translation: { x: number; y: number };
      rotation: { x: number; y: number; z: number; w: number };
    };
  }>;
}

// Subscribes to /map (the live occupancy grid) and the TF tree, and resolves the robot's
// pose in the map frame. robotPose is null until the full map->...->base_link chain exists.
export function useSlamMap(ros: ROSLIB.Ros | null): {
  grid: OccupancyGrid | null;
  robotPose: Pose2D | null;
} {
  const [grid, setGrid] = useState<OccupancyGrid | null>(null);
  const [robotPose, setRobotPose] = useState<Pose2D | null>(null);
  const treeRef = useRef<TfTree>(new Map());

  useEffect(() => {
    if (!ros) return;

    const mapTopic = new ROSLIB.Topic({
      ros,
      name: MAP_TOPIC,
      messageType: 'nav_msgs/OccupancyGrid',
      throttle_rate: MAP_THROTTLE_MS,
      queue_length: 1,
      latch: true, // Attempt to request transient_local durability for Nav2 map_server
    });
    const onMap = (m: ROSLIB.Message) => setGrid(m as unknown as OccupancyGrid);
    mapTopic.subscribe(onMap);

    const ingest = (msg: ROSLIB.Message) => {
      const m = msg as unknown as TfMessage;
      for (const t of m.transforms) {
        treeRef.current.set(t.child_frame_id, {
          parent: t.header.frame_id,
          pose: {
            x: t.transform.translation.x,
            y: t.transform.translation.y,
            yaw: quatToYaw(t.transform.rotation),
          },
        });
      }
      setRobotPose(resolvePose(treeRef.current, ROBOT_FRAME, MAP_FRAME));
    };
    const tf = new ROSLIB.Topic({
      ros,
      name: TF_TOPIC,
      messageType: 'tf2_msgs/TFMessage',
      throttle_rate: 100,
      queue_length: 1,
    });
    const tfStatic = new ROSLIB.Topic({
      ros,
      name: TF_STATIC_TOPIC,
      messageType: 'tf2_msgs/TFMessage',
    });
    tf.subscribe(ingest);
    tfStatic.subscribe(ingest);

    return () => {
      mapTopic.unsubscribe(onMap);
      tf.unsubscribe(ingest);
      tfStatic.unsubscribe(ingest);
    };
  }, [ros]);

  return { grid, robotPose };
}
