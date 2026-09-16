# NavHub 🧭

NavHub is a powerful, web-based mission control interface for ROS 2 robots, built with React, Node.js, and ROS 2 Jazzy. It gives you a sleek, mobile-friendly interface completely over your local network to teleoperate your robot, run live SLAM mapping, edit map files, record waypoint locations, and dispatch autonomous navigation missions. 

## 🚀 How to Launch the Application

Make sure MongoDB is running on your machine. Then, simply run the startup script which brings up the webserver and the ROS bridge for you:

```bash
# 1. Start the NavHub interface
cd NavHub
./scripts/start_navhub.sh
```

You will also need to start the odometry for your robot in a separate terminal:
```bash
# 2. Run the odom script (run your specific odom file)
# Example:
python3 path/to/your/odom_file.py
```

Once running, open a web browser on any device connected to the same Wi-Fi and go to:
`http://<YOUR_ROBOTS_IP_ADDRESS>:5000`

---

## 🗺️ How to Use the Interface

The interface is divided into several sections on the left-hand navigation bar, designed to follow the lifecycle of setting up a robot:

* **Teleoperation**: The simplest page. Use `W`/`A`/`S`/`D` keys to manually drive the robot around, control its speed, or hit the Emergency Stop.
* **Mapping**: Start `slam_toolbox` to begin mapping your environment. Drive the robot around and watch the map appear in real-time. When finished, name the map and save it!
* **Maps**: View the maps you've saved. You can delete outdated maps, or use the **Map Editor** to clean up the map (erase LiDAR noise, draw solid borders to block paths).
* **Points**: Load a saved map in "recording mode." Drive the robot manually using your keyboard to reach specific spots in the room, and use the "Record Here" button to permanently save those target coordinates.
* **Navigation**: Load a map to run `nav2` autonomous driving! Teleop is intentionally disabled here to prevent interference. You can set the robot's initial pose, click on the map to send a raw goal, or use your saved Points to automatically dispatch the robot to those locations.

---

## 🤖 Optional: Automatic Boot Service
If you want NavHub to start automatically every time you turn on your Raspberry Pi (without opening terminals), you can install the provided systemd service:

```bash
# Verify the paths in the service file match your robot:
cat scripts/navhub.service

# Copy the service and enable it to start on boot
sudo cp scripts/navhub.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable navhub.service
sudo systemctl start navhub.service
```
