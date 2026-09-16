import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import TeleopPage from './pages/TeleopPage';
import MappingPage from './pages/MappingPage';
import NavigationPage from './pages/NavigationPage';
import MapsPage from './pages/MapsPage';
import { useRos } from './services/ros';
import { useServerState } from './hooks/useServerState';
import { useTeleop } from './hooks/useTeleop';
import { TeleopProvider } from './contexts/TeleopContext';
import { ControlProvider, useControlContext } from './contexts/ControlContext';

function NavHub() {
  const { status } = useRos();
  const server = useServerState();
  const { hasControl } = useControlContext();
  const canDrive = hasControl && server.teleopAllowed && status === 'connected';
  const teleop = useTeleop(canDrive);

  return (
    <TeleopProvider value={teleop}>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <Routes>
          <Route path="/teleop" element={<TeleopPage />} />
          <Route path="/mapping" element={<MappingPage />} />
          <Route path="/navigation" element={<NavigationPage />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/" element={<Navigate to="/teleop" replace />} />
        </Routes>
      </div>
    </TeleopProvider>
  );
}

export default function App() {
  return (
    <ControlProvider>
      <NavHub />
    </ControlProvider>
  );
}
