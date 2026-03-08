import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/globals.css';

// Import pages
import Login from './pages/Login';
import AuthorityDashboard from './pages/AuthorityDashboard';
import CitizenDashboard from './pages/CitizenDashboard';
import MissionControlDashboard from './pages/MissionControlDashboard';
import NotFound from './pages/NotFound';
import HumanSensorPage from './pages/HumanSensorPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LiveFeedPage from './pages/LiveFeedPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';
import AlertsPage from './pages/AlertsPage';
import HistoricalSimulationsPage from './pages/HistoricalSimulationsPage';

// Import layout
import DashboardLayout from './components/layout/DashboardLayout';

// Import contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { DataProvider } from './contexts/DataContext';
import { SimulationProvider } from './contexts/SimulationContext';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#1a1b26] text-[#7dcfff] font-mono tracking-widest">LOADING SYSTEM...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role as string)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
};

// Public Route Component
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#1a1b26] text-[#7dcfff] font-mono tracking-widest">CHECKING CREDENTIALS...</div>;
  if (user) {
    if (user.role === 'authority') return <Navigate to="/mission-control" replace />;
    if (user.role === 'citizen') return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const WithLayout = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout>{children}</DashboardLayout>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Mission Control Dashboard */}
      <Route path="/mission-control" element={<ProtectedRoute allowedRoles={['authority']}><WithLayout><MissionControlDashboard /></WithLayout></ProtectedRoute>} />

      {/* Full Feature Pages */}
      <Route path="/analytics" element={<ProtectedRoute allowedRoles={['authority']}><WithLayout><AnalyticsPage /></WithLayout></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute allowedRoles={['authority']}><WithLayout><AlertsPage /></WithLayout></ProtectedRoute>} />
      <Route path="/live-feed" element={<ProtectedRoute allowedRoles={['authority']}><WithLayout><LiveFeedPage /></WithLayout></ProtectedRoute>} />
      <Route path="/human-sensor" element={<ProtectedRoute allowedRoles={['authority']}><WithLayout><HumanSensorPage /></WithLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['authority']}><WithLayout><SettingsPage /></WithLayout></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute allowedRoles={['authority']}><WithLayout><HelpPage /></WithLayout></ProtectedRoute>} />
      <Route path="/simulations" element={<ProtectedRoute allowedRoles={['authority']}><WithLayout><HistoricalSimulationsPage /></WithLayout></ProtectedRoute>} />

      {/* Legacy Authority Dashboard */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['authority']}><AuthorityDashboard /></ProtectedRoute>} />

      {/* Citizen */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['citizen']}><CitizenDashboard /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AlertProvider>
          <DataProvider>
            <SimulationProvider>
              <AppRoutes />
            </SimulationProvider>
          </DataProvider>
        </AlertProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
