# NavHub Startup Scripts

These files configure NavHub to run persistently on your robot's Raspberry Pi.

## `start_navhub.sh`
A run script that brings up both `rosbridge_server` (port 9090) and the Node.js backend API (port 5000), which automatically serves the pre-built React frontend.

**Usage:**
```bash
cd NavHub/frontend && npm run build
../scripts/start_navhub.sh
```

## `navhub.service`
A systemd unit file for headless automatic boot. It relies on MongoDB and your robot's driver nodes.

**To Install:**
1. verify `User` and `WorkingDirectory` in `navhub.service` map to your Pi's username/path.
2. Copy it to systemd:
   ```bash
   sudo cp navhub.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable navhub.service
   sudo systemctl start navhub.service
   ```
