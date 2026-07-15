import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "./context/AppContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import PatientsPage from "./pages/PatientsPage";
import PatientDetailPage from "./pages/PatientDetailPage";
import PatientTypesPage from "./pages/PatientTypesPage";
import CardsPage from "./pages/CardsPage";
import KioskPage from "./pages/KioskPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import BranchesPage from "./pages/BranchesPage";
import DevicesPage from "./pages/DevicesPage";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useApp();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/kiosk" replace />} />
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/patient-types" element={<PatientTypesPage />} />
        <Route path="/cards" element={<CardsPage />} />
        <Route path="/activity-log" element={<ActivityLogPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/devices" element={<DevicesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
