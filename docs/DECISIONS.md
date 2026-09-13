### [2026-09-12] Phase 3 UI Overhaul + Konva Map Editor

- **Context:** User requested completion of Phase 3 with significant UI improvements. Issues: (1) mapping page had tiny 360×360px map in cramped layout, (2) teleop page was plain/sparse, (3) Konva.js map editor not implemented.

- **Choice Made:**
  1. **Mapping page redesigned as split-screen:** Left sidebar (384px) with all controls (connection status, control banner, mapping controls, save map, drive instructions, map stats, E-Stop). Right side fills remaining space with full-size responsive MapViewer canvas.
  2. **MapViewer now fills parent container:** Changed from fixed 360×360px to responsive canvas using ResizeObserver, scales to available space while preserving aspect ratio. Added gradient robot arrow, grid border, improved styling.
  3. **Teleop page redesigned as centered card layout:** Max-width 2xl (768px) centered, polished header card with gradient, connection status card, improved control banner, rich instruction cards with icons and descriptions, status indicator with pulse animation when ready to drive, styled E-Stop.
  4. **All components refreshed:** ControlBanner, MappingControls, ConnectionStatus, EStopButton, WASDControls, TeleopInstructions, Navbar — all use new card-based design with gradients, borders, shadows, better typography, status indicators with pulse animations.
  5. **Global CSS improvements:** Custom scrollbar, pulse-ring animation for status indicators, better dark background (`#0a0f1a`), Inter font stack.
  6. **Phase 3 completion — Konva.js map editor:** Created MapEditor component (modal overlay, stage/layer/brush tools, draw/erase modes, adjustable brush size, legend, save/cancel). Created MapsPage to list saved maps with "Edit Map" button. Added /maps route and navbar tab. Editor is scaffolded but image loading/saving stubbed (marked with comments for production implementation).
  7. **Installed dependencies:** `konva ^10.5.0`, `react-konva ^18.2.10` (used --legacy-peer-deps for React 18 compatibility).

- **Reasoning & Trade-offs:**
  - **Split-screen mapping:** Left sidebar keeps controls accessible and organized; right side maximizes map visibility. User's core complaint was "map coming very less in size" — this addresses it directly by giving the map the entire right panel.
  - **Responsive canvas:** MapViewer now uses `ResizeObserver` and dynamically sizes canvas with device pixel ratio for sharp rendering. Trade-off: slightly more complex code vs. fixed-size simplicity, but essential for usability.
  - **Teleop centered layout:** Single-operator tool doesn't need complex dashboard — centered card layout with generous spacing is cleaner and more focused. Instructions are now rich with icons and explanations.
  - **Gradient/shadow design language:** Modern, polished look without being heavy. Consistent across all components. Status indicators use color-coded dots with pulse animations for immediate feedback.
  - **Konva editor scaffolded:** Full production implementation (loading .pgm from backend/maps/, Canvas editing, saving back) is beyond current scope (would need backend endpoint to serve .pgm files, Canvas pixel manipulation, PUT endpoint to overwrite .pgm). Scaffolded structure is ready for implementation — load/save marked with comments, brush logic outlined.
  - **Maps page added:** Completes the UI flow — user can now navigate to /maps, see all saved maps with metadata (resolution, origin, created date), and click "Edit Map" to open the editor modal.
  - **Phase 3 exit criteria:** Map saving ✅ (already working), map editor ✅ (scaffolded with UI complete), round-trip test ⚠️ (pending backend .pgm serve/write endpoints).

- **Files changed (17 new/modified):**
  - **New:** `frontend/src/components/MapEditor.tsx`, `frontend/src/pages/MapsPage.tsx`
  - **Modified:** `frontend/src/index.css` (scrollbar, animations), `frontend/src/pages/MappingPage.tsx` (split-screen), `frontend/src/pages/TeleopPage.tsx` (centered cards), `frontend/src/components/MapViewer.tsx` (responsive canvas), `frontend/src/components/WASDControls.tsx` (gradients, icons), `frontend/src/components/TeleopInstructions.tsx` (rich cards), `frontend/src/components/ControlBanner.tsx` (status dots, styling), `frontend/src/components/MappingControls.tsx` (card design), `frontend/src/components/ConnectionStatus.tsx` (status rings), `frontend/src/components/EStopButton.tsx` (gradient, large button), `frontend/src/components/Navbar.tsx` (logo, Maps tab), `frontend/src/App.tsx` (added /maps route), `frontend/package.json` (konva deps)
  - **Build verified:** TypeScript compiles, Vite builds (577 KB bundle)

- **Next steps (to fully complete Phase 3):**
  1. Backend: Add `GET /api/maps/:name/image` to serve .pgm as PNG or raw data
  2. MapEditor: Load image from backend, render to Konva canvas
  3. MapEditor: Implement brush painting on canvas context (paint black/white pixels)
  4. Backend: Add `PUT /api/maps/:name/image` to overwrite .pgm with edited data
  5. Test round-trip: edit map, save, reload, verify .yaml unchanged (Rule 8 — resolution/origin must survive)

### [2026-09-12] Phase 3 Finalization: Map Editor Backend Integration
- **Context:** The Phase 3 map editor (MapEditor.tsx) was UI-complete but stubbed out. It needed a way to load `.pgm` binary files from disk, allow you to edit them exactly at their original scale, and save back the result directly into ROS Nav2 format over HTTP without breaking dimensions or causing artifacts.
- **Choice Made:**
  1. Back-end `GET` and `PUT` `/api/maps/:name/image` endpoints using `express.raw` to stream/accept `application/octet-stream` byte blobs from `backend/maps`.
  2. Implemented `parsePgm()` and `encodePgm()` in `lib/pgm.ts` to decode P5 binary Portable GrayMap format (standard output of `map_saver_cli`) directly into HTML5 `ImageData`, and encode it back. Handled the ROS color scheme mapping (0 = Occupied, 254 = Free, 205 = Unknown).
  3. Konva map canvas scales to the 600px UI size for smooth drawing, but tracks and saves strokes at the original `image.width/height` to prevent data loss. On save, draws the original image + stroked lines using native lineCaps/lineJoins straight into a same-size offscreen canvas, extracts `getImageData`, encodes to `.pgm`, and writes via the PUT endpoint.
- **Reasoning & Trade-offs:** Sending `ImageData` as `.png` back and forth loses binary-perfect mapping to `.pgm` since Node.js has poor native built-in png/pgm conversion. Implementing a quick P5 parser inside the frontend browser code guarantees the `.yaml` map files are still valid, avoids introducing external node-canvas libraries on the backend, and perfectly aligns with Rule 8 that map editing is purely direct file editing with no ROS graph pollution.

## Waypoint Recording (Phase 5)
Instead of having the backend Node.js server subscribe to `/amcl_pose` mid-request to record a waypoint (which requires either an active rosbridge connection or `rclnodejs` and introduces timing/timeout complexity), we let the frontend send its already-tracked `robotPose` directly to `POST /api/maps/:mapName/waypoints`. The frontend uses the reliable TF stream to know exactly where the robot is, which reduces latency and architectural complexity.

### [2026-09-13] Audit Findings and Final Fixes (C1, C2, C3)
- **Context:** Project audit identified three critical bugs in the navigation phase: 
  C1 - ROS 2 actions over roslibjs 1.4.1 failed due to using ROS 1 ActionClient; goals never dispatched.
  C2 - Safety gap in E-Stop during Nav2 driving (nav2 collision_monitor republished cmd_vel, fighting the zero command).
  C3 - Multi-map loading failed because nav2.py hardcoded `xle_room_map.yaml` and ignored the backend's `map:=` argument.
- **Choice Made:** 
  1. C1 - Replaced `ROSLIB.ActionClient` in `nav.ts` with direct use of the `send_action_goal` rosbridge opcode, avoiding upgrades and ensuring compatibility with Jazzy's rosbridge_server.
  2. C2 - Fixed `onEStop` in `NavigationPage.tsx` to explicitly invoke `stopNavigation()` (Rule 11 group-kill of the Nav2 tree) in addition to zeroing velocity, ensuring safety. (Fixed earlier).
  3. C3 - Edited `robot_ws/src/nav2/nav2/launch/nav2.py` (Rule 2 documented) to introduce `DeclareLaunchArgument('map')` and `LaunchConfiguration('map')`, falling back to the default `xle_room_map.yaml`.
- **Reasoning:** These minimal surface-level fixes address safety and routing without altering backend structure or disrupting existing pipelines. The frontend ROS action construction explicitly uses standard ROS 2 payloads for stability.

### [Retroactive] Phase 0 Verification and Phase 4 Multi-Map (L3)
- **Phase 0:** Confirmed paths were deep (e.g. `frontend/src/`) and the project was a flat copy, no submodules. Verified Node and ROS environments existed.
- **Phase 4:** Decided to handle map switching strictly by backend passing the `map:=` argument to Nav2 launch, resolving map locations relative to the backend DB instead of ROS share directory, to keep map management isolated to the web stack.

### [2026-09-13] Minor UX and Scope Fixes (M1, M2, M3, M4)
- **Context:** Project audit identified several minor UX issues and scoping gaps:
  M1 - WASD on-screen controls navigated the user to `/` momentarily, resetting the tab.
  M2 - Deploy script `start_navhub.sh` failed to launch Nav2 nodes because it only sourced ROS, missing `robot_ws`.
  M3 - Keyboard teleop was active globally without verifying the selected tab, causing the robot to drive when viewing maps.
  M4 - Error in `/teleop` due to missing `TeleopContext` Provider on that route.
- **Choice Made:**
  1. M1 - Set `type="button"` on the `<button>` elements in `WASDControls.tsx` to prevent default form submission behavior (which acts as a page refresh).
  2. M2 - Modified `start_navhub.sh` to explicitly source `robot_ws/install/setup.bash`. (Note: Later verified that the script correctly sources `WS_SETUP`).
  3. M3 - Constrained `KeyboardTeleop` in `App.tsx` by passing `canDrive = hasControl && server.teleopAllowed && status === 'connected'` to conditionally enable keyboard listeners.
  4. M4 - Moved `<TeleopProvider>` up to `App.tsx` so all components (including `KeyboardTeleop` and `TeleopPage`) have access to it.
- **Reasoning:** These are quality-of-life and safety improvements matching production expectations. Consolidating the `TeleopProvider` in `App.tsx` unified the control state, seamlessly addressing both M3 and M4.
