# NavHub 🧭

NavHub is a powerful, web-based mission control interface for ROS 2 robots, built with React, Node.js/Express, and ROS 2 Jazzy. It gives you a sleek, mobile-friendly interface to teleoperate your robot, run live SLAM mapping, edit map files dynamically through the browser, and dispatch autonomous navigation waypoints—all over your local network.

## Features
- **Phase 1: Teleoperation:** Low-latency WASD controls and Emergency Stop functionality with connection health monitoring.
- **Phase 2: SLAM Mapping:** Launch and supervise `slam_toolbox` right from your browser, visualizing real-time map generation and robot positioning.
- **Phase 3: Map Persistence & Editing:** Save maps seamlessly and edit them directly in the browser (using Konva.js) to clean up LiDAR artifacts or define logical boundaries without breaking SLAM configs.
- **Phase 4: Navigation:** Dispatch your robot using `nav2` via Action Clients by simply clicking on the map.
- **Phase 5: Waypoint Database:** Save exact room geometries to a MongoDB database to recall precise target poses instantly.
- **Phase 6: Headless Deployment:** Configured via `systemd` to boot effortlessly right when you turn on your Raspberry Pi.

---

## Prerequisites
- **Node.js**: v18+ 
- **ROS 2**: Jazzy (or compatible distributions with `slam_toolbox`, `nav2`, and `rosbridge_suite` installed).
- **MongoDB**: A running `mongod` database instance (usually on standard `localhost:27017`).

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Yunis147/NavHub.git
cd NavHub
```

### 2. Install Dependencies

You will need to install Node/NPM dependencies for both the `frontend` and the `backend`.

```bash
# Install frontend dependencies
cd frontend
npm install

# Build the frontend (required for the backend to serve it)
npm run build

# Install backend dependencies
cd ../backend
npm install
cd ..
```

---

## 🏃 Running the Application (Manual Method)

To run the application manually during development or testing, you'll need **two terminals** (assuming your core ROS 2 environment/LiDAR nodes are already active).

### Terminal 1: Run the Backend & UI Server
The NavHub Express server handles API requests, database connectivity, spawns internal ROS processes (like Nav2 or mapping), and serves your built React UI.

```bash
cd NavHub/backend
# Optional: Ensure ROS is sourced if you are running this natively on the robot!
# source /opt/ros/jazzy/setup.bash
npm start
```
*The server will boot on `http://0.0.0.0:5000`.*

### Terminal 2: Run ROS Bridge
The web interface needs to communicate directly with ROS via WebSockets.

```bash
source /opt/ros/jazzy/setup.bash
# If you have a custom robot workspace, source it here as well
# source ~/robot_ws/install/setup.bash 

# Start the websocket broker on port 9090
ros2 launch rosbridge_server rosbridge_websocket_launch.xml port:=9090
```

*Note: You can access the UI by going to `http://<YOUR_ROBOTS_IP_ADDRESS>:5000` from any laptop or mobile device on the same WiFi network!*

---

## 🤖 Automatic Robot Deployment (Systemd Auto-Start)

If you are running this on a real robot (like a Raspberry Pi), we've packaged a native startup script that launches both the backend and `rosbridge_server` automatically without needing to open multiple terminals!

To install the service so NavHub starts reliably as soon as the robot boots up:

```bash
# Verify the paths and usernames in the service file match your robot:
cat scripts/navhub.service

# Copy the service to systemd
sudo cp scripts/navhub.service /etc/systemd/system/

# Reload and enable
sudo systemctl daemon-reload
sudo systemctl enable navhub.service
sudo systemctl start navhub.service
```

---

*Built for advanced agentic robotics. Let's get moving!* 🏁
