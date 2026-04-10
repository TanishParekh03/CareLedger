import { useState } from 'react';
import {
  Bell,
  Building2,
  ChevronRight,
  ClipboardList,
  LogOut,
  Menu,
  ShieldCheck,
  Siren,
  Stethoscope,
  UserRoundCog,
  X,
} from 'lucide-react';
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`doctor-dashboard-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
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
          <p className="doctor-logo">CareLedger</p>
        </div>
        <div className="mobile-topbar-right-group">
          <button type="button" className="doctor-icon-dot" aria-label="notifications">
            <Bell size={16} />
          </button>
          <span className="doctor-role-chip">
            <ShieldCheck size={12} /> Doctor
          </span>
        </div>
      </header>

      {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
      {mobileOpen ? (
        <div className="sidebar-mobile-overlay" onClick={() => setMobileOpen(false)} />
      ) : null}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`doctor-sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        onClick={(e) => {
          if (e.target.closest('a') || e.target.closest('button')) return;
          if (!mobileOpen) setCollapsed((prev) => !prev);
        }}>
        <div className="sidebar-top-section">
          <div className="doctor-logo-wrap">
            <div className="doctor-logo-mark" aria-hidden="true" />
            {!collapsed ? <p className="doctor-logo">CareLedger</p> : null}
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {!collapsed ? <p className="doctor-sidebar-label">Doctor Workspace</p> : null}

        <nav className="doctor-nav-group">
          {NAV_ITEMS.map(({ to, label, caption, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard/doctor'}
              className={({ isActive }) => (isActive ? 'doctor-nav-link active' : 'doctor-nav-link')}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
            >
              <div className="doctor-nav-icon">
                <Icon size={16} />
              </div>
              {!collapsed ? (
                <div>
                  <span className="doctor-nav-title">{label}</span>
                  <p className="doctor-nav-caption">{caption}</p>
                </div>
              ) : null}
            </NavLink>
          ))}
        </nav>

        {!collapsed ? (
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
        ) : (
          <div className="doctor-sidebar-footer collapsed-footer">
            <button type="button" className="doctor-logout-btn" onClick={logout} title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <section className="doctor-main-panel">
        <header className="doctor-topbar">
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
              <p className="doctor-bread">Clinical Workspace</p>
              <h1>Doctor Dashboard</h1>
            </div>
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
