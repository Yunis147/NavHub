// 2D rigid-transform math for the SLAM viewer (Rule 4). We only need x, y, yaw for a
// top-down map, so full 3D transforms are projected to the plane.
//
// Runnable self-check (no framework): compile+run this file's _selfCheck() with
//   npx esbuild src/lib/tf2d.ts --bundle --format=esm --outfile=/tmp/tf.mjs && \
//   node --input-type=module -e "import('/tmp/tf.mjs').then(m=>m._selfCheck())"

export interface Pose2D {
  x: number;
  y: number;
  yaw: number; // radians, CCW positive (ROS REP-103)
}

export interface Quat {
  x?: number;
  y?: number;
  z?: number;
  w?: number;
}

// child_frame_id -> { parent, pose-of-child-in-parent }
export type TfTree = Map<string, { parent: string; pose: Pose2D }>;

export function quatToYaw(q: Quat): number {
  const x = q.x ?? 0;
  const y = q.y ?? 0;
  const z = q.z ?? 0;
  const w = q.w ?? 1;
  return Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
}

// Compose a ∘ b: given `a` = pose of frame F in parent P, and `b` = a pose expressed in F,
// return that pose expressed in P.
export function compose(a: Pose2D, b: Pose2D): Pose2D {
  const c = Math.cos(a.yaw);
  const s = Math.sin(a.yaw);
  return {
    x: a.x + c * b.x - s * b.y,
    y: a.y + s * b.x + c * b.y,
    yaw: a.yaw + b.yaw,
  };
}

// Pose of `target` frame expressed in `root` frame, walking child->parent links.
// Returns null if the chain to root isn't fully present yet (e.g. before SLAM publishes map->odom).
export function resolvePose(tree: TfTree, target: string, root: string): Pose2D | null {
  let frame = target;
  let acc: Pose2D = { x: 0, y: 0, yaw: 0 };
  for (let i = 0; i < 32 && frame !== root; i++) {
    const link = tree.get(frame);
    if (!link) return null;
    acc = compose(link.pose, acc); // prepend parent-of-frame on the left
    frame = link.parent;
  }
  return frame === root ? acc : null;
}

function approx(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

export function _selfCheck(): void {
  const HALF_PI = Math.PI / 2;
  // pure-yaw quaternion (z = sin(θ/2), w = cos(θ/2)) round-trips to θ
  if (!approx(quatToYaw({ z: Math.sin(HALF_PI / 2), w: Math.cos(HALF_PI / 2) }), HALF_PI)) {
    throw new Error('quatToYaw pure-yaw');
  }
  // identity ∘ p = p
  const p = { x: 1, y: 2, yaw: 0.3 };
  const id = compose({ x: 0, y: 0, yaw: 0 }, p);
  if (!approx(id.x, 1) || !approx(id.y, 2) || !approx(id.yaw, 0.3)) throw new Error('compose identity');
  // a 90° frame at origin turns a +x offset into +y
  const r = compose({ x: 0, y: 0, yaw: HALF_PI }, { x: 1, y: 0, yaw: 0 });
  if (!approx(r.x, 0) || !approx(r.y, 1)) throw new Error('compose rotate');
  // chain map->odom(+2x)->base(+1y, 90°): base origin is at map (2,1)
  const tree: TfTree = new Map([
    ['odom', { parent: 'map', pose: { x: 2, y: 0, yaw: 0 } }],
    ['base_link', { parent: 'odom', pose: { x: 0, y: 1, yaw: HALF_PI } }],
  ]);
  const pose = resolvePose(tree, 'base_link', 'map');
  if (!pose || !approx(pose.x, 2) || !approx(pose.y, 1) || !approx(pose.yaw, HALF_PI)) {
    throw new Error('resolvePose chain');
  }
  // missing link -> null
  if (resolvePose(new Map(), 'base_link', 'map') !== null) throw new Error('resolvePose missing');
  console.log('tf2d self-check OK');
}
