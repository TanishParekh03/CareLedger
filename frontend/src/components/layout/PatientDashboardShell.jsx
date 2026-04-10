import { useState } from 'react';
import {
  Bell,
  ChevronRight,
  CloudCog,
  HeartPulse,
  LogOut,
  Menu,
  Pill,
  ShieldPlus,
  Siren,
  Stethoscope,
  User,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/dashboard/patient', label: 'Overview', caption: 'Today at a glance', icon: User },
  { to: '/dashboard/patient/profile', label: 'Profile', caption: 'Identity and blood group', icon: UserRoundCheck },
  { to: '/dashboard/patient/access', label: 'Doctor Access', caption: 'Grant or revoke visibility', icon: ShieldPlus },
  { to: '/dashboard/patient/active-medications', label: 'Active Medications', caption: 'Current prescriptions in use', icon: Pill },
  { to: '/dashboard/patient/allergies', label: 'Allergies', caption: 'Risk triggers and severity', icon: HeartPulse },
  { to: '/dashboard/patient/emergency-contacts', label: 'Emergency', caption: 'Immediate contact chain', icon: Siren },
  { to: '/dashboard/patient/consultations', label: 'Consultations', caption: 'Recent and ongoing visits', icon: Stethoscope },
  { to: '/dashboard/patient/legacy-documents', label: 'Legacy Upload', caption: 'Import old documents via OCR', icon: CloudCog },
];

function PatientDashboardShell() {
  const { auth, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className={`patient-dashboard-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Mobile top bar ──────────────────────────────────────────────────── */}
      <header className="mobile-topbar">
        <div className="mobile-topbar-left">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <p className="patient-logo">CareLedger</p>
        </div>
        <div className="mobile-topbar-right-group">
          <button type="button" className="patient-icon-dot" aria-label="notifications">
            <Bell size={16} />
          </button>
          <span className="patient-role-chip">Patient</span>
        </div>
      </header>

      {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
      {mobileOpen ? (
        <div className="sidebar-mobile-overlay" onClick={() => setMobileOpen(false)} />
      ) : null}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`patient-sidebar ${mobileOpen ? 'mobile-open' : ''} `}
        onClick={(e) => {
          if (e.target.closest('a') || e.target.closest('button')) return;
          if (!mobileOpen) setCollapsed((prev) => !prev)
        }}>
        <div className="sidebar-top-section">
          <div className="patient-logo-wrap">
            <div className="patient-logo-mark" aria-hidden="true" />
            {!collapsed ? <p className="patient-logo">CareLedger</p> : null}
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => { setMobileOpen(false); setCollapsed(true) }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {!collapsed ? <p className="patient-sidebar-label">Patient Workspace</p> : null}

        <nav className="patient-nav-group">
          {NAV_ITEMS.map(({ to, label, caption, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard/patient'}
              className={({ isActive }) => (isActive ? 'patient-nav-link active' : 'patient-nav-link')}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
            >
              <div className="patient-nav-icon">
                <Icon size={16} />
              </div>
              {!collapsed ? (
                <div>
                  <span className="patient-nav-title">{label}</span>
                  <p className="patient-nav-caption">{caption}</p>
                </div>
              ) : null}
            </NavLink>
          ))}
        </nav>

        {!collapsed ? (
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
        ) : (
          <div className="patient-sidebar-footer collapsed-footer">
            <button type="button" className="patient-logout-btn" onClick={logout} title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <section className="patient-main-panel">
        <header className="patient-topbar">
          <div className="topbar-left-group">
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronRight size={16} className={collapsed ? '' : 'chevron-flip'} />
            </button>
            <div>
              <p className="patient-bread">Clinical Snapshot</p>
              <h1>Care Overview</h1>
            </div>
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
