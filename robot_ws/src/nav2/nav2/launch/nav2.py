import os
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription, DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory

def generate_launch_description():

    # Resolve map/config from the installed package share dir so paths work on any
    # machine (Pi or laptop) regardless of username or checkout location.
    pkg_share   = get_package_share_directory('nav2')
    default_map_file = os.path.join(pkg_share, 'map', 'xle_room_map.yaml')
    filter_yaml = os.path.join(pkg_share, 'params', 'laser_filter.yaml')
    nav2_params = os.path.join(pkg_share, 'params', 'nav2_params.yaml')

    map_arg = DeclareLaunchArgument(
        'map',
        default_value=default_map_file,
        description='Full path to map yaml file to load'
    )

    rplidar_node = Node(
        package='rplidar_ros',
        executable='rplidar_node',
        name='rplidar_node',
        output='screen',
        parameters=[{
            'serial_port': '/dev/ttyUSB0',
            'serial_baudrate': 115200,
            'frame_id': 'laser',
            'angle_compensate': True,
        }],
        remappings=[('scan', '/scan_raw')]
    )

    laser_filter_node = Node(
        package='laser_filters',
        executable='scan_to_scan_filter_chain',
        name='laser_filter',
        output='screen',
        parameters=[filter_yaml],
        remappings=[
            ('scan', '/scan_raw'),
            ('scan_filtered', '/scan')
        ]
    )

    # Base to Laser TF (confirmed correct: x=0.01, z=0.6, yaw=1.57)
    static_tf_laser = Node(
        package='tf2_ros',
        executable='static_transform_publisher',
        name='base_to_laser_tf',
        arguments=['0.01', '0.0', '0.6', '1.57', '0.0', '0.0', 'base_link', 'laser']
    )

    nav2_bringup_dir = get_package_share_directory('nav2_bringup')
    nav2_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            os.path.join(nav2_bringup_dir, 'launch', 'bringup_launch.py')
        ),
        launch_arguments={
            'map': LaunchConfiguration('map'),
            'use_sim_time': 'false',
            'params_file': nav2_params
        }.items()
    )

    return LaunchDescription([
        map_arg,
        rplidar_node,
        laser_filter_node,
        static_tf_laser,
        nav2_launch
    ])
