import {
  Bell,
  ClipboardPlus,
  HeartPulse,
  LogOut,
  ShieldPlus,
  Siren,
  Stethoscope,
  User,
  UserRoundCheck,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/dashboard/patient', label: 'Overview', caption: 'Today at a glance', icon: User },
  { to: '/dashboard/patient/profile', label: 'Profile', caption: 'Identity and blood group', icon: UserRoundCheck },
  { to: '/dashboard/patient/access', label: 'Doctor Access', caption: 'Grant or revoke visibility', icon: ShieldPlus },
  { to: '/dashboard/patient/allergies', label: 'Allergies', caption: 'Risk triggers and severity', icon: HeartPulse },
  { to: '/dashboard/patient/chronic-conditions', label: 'Conditions', caption: 'Long-term health history', icon: ClipboardPlus },
  { to: '/dashboard/patient/emergency-contacts', label: 'Emergency', caption: 'Immediate contact chain', icon: Siren },
  { to: '/dashboard/patient/consultations', label: 'Consultations', caption: 'Recent and ongoing visits', icon: Stethoscope },
];

function PatientDashboardShell() {
  const { auth, logout } = useAuth();

  return (
    <div className="patient-dashboard-layout">
      <aside className="patient-sidebar">
        <div className="patient-logo-wrap">
          <div className="patient-logo-mark" aria-hidden="true" />
          <p className="patient-logo">CareLedger</p>
        </div>

        <p className="patient-sidebar-label">Patient Workspace</p>

        <nav className="patient-nav-group">
          {NAV_ITEMS.map(({ to, label, caption, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard/patient'}
              className={({ isActive }) => (isActive ? 'patient-nav-link active' : 'patient-nav-link')}
            >
              <div className="patient-nav-icon">
                <Icon size={16} />
              </div>
              <div>
                <span className="patient-nav-title">{label}</span>
                <p className="patient-nav-caption">{caption}</p>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="patient-sidebar-footer">
          <div className="patient-avatar">P</div>
          <div>
            <p className="patient-footer-name">Patient</p>
            <p className="patient-footer-meta">ID {auth?.userId?.slice(0, 8) || 'User'}</p>
          </div>
          <button type="button" className="patient-logout-btn" onClick={logout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <section className="patient-main-panel">
        <header className="patient-topbar">
          <div>
            <p className="patient-bread">Clinical Snapshot</p>
            <h1>Care Overview</h1>
          </div>
          <div className="patient-topbar-right">
            <button type="button" className="patient-icon-dot" aria-label="notifications">
              <Bell size={16} />
            </button>
            <span className="patient-role-chip">Patient</span>
          </div>
        </header>

        <div className="patient-content-wrap">
          <Outlet />
        </div>
      </section>
    </div>
  );
}

export default PatientDashboardShell;
