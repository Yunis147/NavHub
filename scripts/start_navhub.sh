#!/bin/bash
set -e

# NavHub Startup Script (Phase 6)
# Starts rosbridge_server and the Node Express backend.
# Assumes MongoDB is already running.

NAVHUB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export ROS_DISTRO=${ROS_DISTRO:-jazzy}
ROS_SETUP="/opt/ros/${ROS_DISTRO}/setup.bash"
WS_SETUP="${NAVHUB_DIR}/robot_ws/install/setup.bash"

if [ -f "$ROS_SETUP" ]; then
    source "$ROS_SETUP"
fi
if [ -f "$WS_SETUP" ]; then
    source "$WS_SETUP"
fi

echo "[start_navhub] Starting rosbridge_server on port 9090..."
ros2 launch rosbridge_server rosbridge_websocket_launch.xml port:=9090 &
ROSBRIDGE_PID=$!

cleanup() {
    echo "[start_navhub] Terminating..."
    kill -TERM $ROSBRIDGE_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

if [ ! -d "${NAVHUB_DIR}/frontend/dist" ]; then
    echo "[start_navhub] Warning: frontend/dist not found. The UI will not be served."
fi

echo "[start_navhub] Starting Node.js backend..."
cd "${NAVHUB_DIR}/backend"
node src/server.js &
NODE_PID=$!

# Wait for any child process to exit
wait -n
cleanup
