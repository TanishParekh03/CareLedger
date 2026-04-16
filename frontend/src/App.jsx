import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import DoctorDashboardShell from './components/layout/DoctorDashboardShell';
import PatientDashboardShell from './components/layout/PatientDashboardShell';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import DoctorClinicsPage from './pages/doctor/DoctorClinicsPage';
import DoctorConsultationsPage from './pages/doctor/DoctorConsultationsPage';
import DoctorEmergencyPage from './pages/doctor/DoctorEmergencyPage';
import DoctorOverviewPage from './pages/doctor/DoctorOverviewPage';
import DoctorProfilePage from './pages/doctor/DoctorProfilePage';
import PatientAccessPage from './pages/patient/PatientAccessPage';
import PatientActiveMedicationsPage from './pages/patient/PatientActiveMedicationsPage';
import PatientAllergiesPage from './pages/patient/PatientAllergiesPage';
import PatientConditionsPage from './pages/patient/PatientConditionsPage';
import PatientConsultationsPage from './pages/patient/PatientConsultationsPage';
import PatientEmergencyPage from './pages/patient/PatientEmergencyPage';
import PatientLegacyDocumentsPage from './pages/patient/PatientLegacyDocumentsPage';
import PatientOverviewPage from './pages/patient/PatientOverviewPage';
import PatientProfilePage from './pages/patient/PatientProfilePage';
import CareLedgerMarketingPage from './pages/marketing/CareLedgerMarketingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<CareLedgerMarketingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/dashboard/patient"
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientDashboardShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<PatientOverviewPage />} />
        <Route path="profile" element={<PatientProfilePage />} />
        <Route path="access" element={<PatientAccessPage />} />
        <Route path="active-medications" element={<PatientActiveMedicationsPage />} />
        <Route path="allergies" element={<PatientAllergiesPage />} />
        <Route path="chronic-conditions" element={<PatientConditionsPage />} />
        <Route path="emergency-contacts" element={<PatientEmergencyPage />} />
        <Route path="consultations" element={<PatientConsultationsPage />} />
        <Route path="legacy-documents" element={<PatientLegacyDocumentsPage />} />
      </Route>
      <Route
        path="/dashboard/doctor"
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorDashboardShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorOverviewPage />} />
        <Route path="profile" element={<DoctorProfilePage />} />
        <Route path="clinics" element={<DoctorClinicsPage />} />
        <Route path="consultations" element={<DoctorConsultationsPage />} />
        <Route path="emergency" element={<DoctorEmergencyPage />} />
      </Route>
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
