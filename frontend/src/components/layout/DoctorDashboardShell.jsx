import { Bell, Building2, ClipboardList, LogOut, ShieldCheck, Siren, Stethoscope, UserRoundCog } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/dashboard/doctor', label: 'Dashboard', caption: 'Snapshot and queue', icon: ClipboardList },
  { to: '/dashboard/doctor/profile', label: 'Profile', caption: 'Identity and specialty', icon: UserRoundCog },
  { to: '/dashboard/doctor/clinics', label: 'Clinic', caption: 'Manage locations', icon: Building2 },
  { to: '/dashboard/doctor/consultations', label: 'Consultation', caption: 'Patient lookup and Rx', icon: Stethoscope },
  { to: '/dashboard/doctor/emergency', label: 'Emergency', caption: 'Critical response', icon: Siren },
];

function DoctorDashboardShell() {
  const { auth, logout } = useAuth();

  return (
    <div className="doctor-dashboard-layout">
      <aside className="doctor-sidebar">
        <div className="doctor-logo-wrap">
          <div className="doctor-logo-mark" aria-hidden="true" />
          <p className="doctor-logo">CareLedger</p>
        </div>

        <p className="doctor-sidebar-label">Doctor Workspace</p>

        <nav className="doctor-nav-group">
          {NAV_ITEMS.map(({ to, label, caption, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard/doctor'}
              className={({ isActive }) => (isActive ? 'doctor-nav-link active' : 'doctor-nav-link')}
            >
              <div className="doctor-nav-icon">
                <Icon size={16} />
              </div>
              <div>
                <span className="doctor-nav-title">{label}</span>
                <p className="doctor-nav-caption">{caption}</p>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="doctor-sidebar-footer">
          <div className="doctor-avatar">D</div>
          <div>
            <p className="doctor-footer-name">Doctor</p>
            <p className="doctor-footer-meta">ID {auth?.userId?.slice(0, 8) || 'User'}</p>
          </div>
          <button type="button" className="doctor-logout-btn" onClick={logout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <section className="doctor-main-panel">
        <header className="doctor-topbar">
          <div>
            <p className="doctor-bread">Clinical Workspace</p>
            <h1>Doctor Dashboard</h1>
          </div>
          <div className="doctor-topbar-right">
            <button type="button" className="doctor-icon-dot" aria-label="notifications">
              <Bell size={16} />
            </button>
            <span className="doctor-role-chip">
              <ShieldCheck size={12} /> Doctor
            </span>
          </div>
        </header>

        <div className="doctor-content-wrap">
          <Outlet />
        </div>
      </section>
    </div>
  );
}

export default DoctorDashboardShell;
