#!/usr/bin/env python3
"""NavHub deadman: zero /cmd_vel when the commanding client goes silent (Rule 9).

odom.py applies the last /cmd_vel forever (no timeout) and is Rule-2-protected, so the
stop guarantee lives here, outside it. Native rclpy (not routed through rosbridge) so it
survives a rosbridge/websocket crash — the exact "lost connection" failure this guards.
Rationale in docs/DECISIONS.md ("Deadman/watchdog ...").

Always-on and purely silence-triggered: during Nav2 navigation the controller fills
/cmd_vel continuously, so this never sees silence and never fights it; when idle the
robot is already stopped so a zero is a no-op.

Run:        python3 cmd_vel_watchdog.py        (needs ROS sourced)
Self-check: python3 cmd_vel_watchdog.py --selfcheck   (no ROS needed)
"""
import sys

TIMEOUT_S = 0.5   # zero the robot after this much /cmd_vel silence
CHECK_HZ = 20.0   # how often to re-evaluate silence
EPS = 1e-6        # treat |v| below this as zero (Nav2 emits tiny floats)


def is_zero(lx, ly, lz, ax, ay, az):
    return all(abs(v) < EPS for v in (lx, ly, lz, ax, ay, az))


def should_zero(silent, already_zeroed):
    # Publish one zero on the transition into silence; don't spam while already stopped.
    return silent and not already_zeroed


def _selfcheck():
    assert is_zero(0, 0, 0, 0, 0, 0)
    assert is_zero(1e-9, 0, 0, 0, 0, 0)
    assert not is_zero(0.1, 0, 0, 0, 0, 0)
    assert not is_zero(0, 0, 0, 0, 0, -0.2)
    assert should_zero(True, False)          # went silent while driving -> stop
    assert not should_zero(True, True)       # already stopped -> no repeat
    assert not should_zero(False, False)     # actively driving -> leave alone
    assert not should_zero(False, True)
    print("cmd_vel_watchdog selfcheck OK")


def main():
    import rclpy
    from rclpy.node import Node
    from geometry_msgs.msg import Twist

    class CmdVelWatchdog(Node):
        def __init__(self):
            super().__init__('cmd_vel_watchdog')
            self.pub = self.create_publisher(Twist, '/cmd_vel', 10)
            self.create_subscription(Twist, '/cmd_vel', self._on_cmd, 10)
            self.last_msg = self.get_clock().now()
            self.zeroed = True  # start assuming stopped
            self.create_timer(1.0 / CHECK_HZ, self._tick)
            self.get_logger().info(f'cmd_vel watchdog up: zero after {TIMEOUT_S}s of silence')

        def _on_cmd(self, msg):
            # A zero command (incl. our own) means "already stopped"; nonzero re-arms.
            self.zeroed = is_zero(
                msg.linear.x, msg.linear.y, msg.linear.z,
                msg.angular.x, msg.angular.y, msg.angular.z,
            )
            self.last_msg = self.get_clock().now()

        def _tick(self):
            silent = (self.get_clock().now() - self.last_msg).nanoseconds > TIMEOUT_S * 1e9
            if should_zero(silent, self.zeroed):
                self.pub.publish(Twist())  # all-zero
                self.zeroed = True
                self.get_logger().warn('/cmd_vel went silent -> published zero (deadman)')

    rclpy.init()
    node = CmdVelWatchdog()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    if '--selfcheck' in sys.argv:
        _selfcheck()
    else:
        main()
