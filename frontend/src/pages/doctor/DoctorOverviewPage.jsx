import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CalendarClock, ClipboardCheck, Stethoscope, UserRoundCog, Waves } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link, useLocation } from 'react-router-dom';
import { getDoctorClinics } from '../../api/clinics';
import { getDoctorConsultations, getDoctorProfile } from '../../api/doctors';
import { formatDate, titleCase } from '../../utils/formatters';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

function DoctorOverviewPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [clinics, setClinics] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setNotice('');

      const [profileRes, consultationRes, clinicsRes] = await Promise.allSettled([
        getDoctorProfile(),
        getDoctorConsultations(),
        getDoctorClinics(),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value?.data || null);
      } else {
        const status = profileRes.reason?.response?.status;
        if (status !== 404) {
          setNotice('Unable to fully sync doctor dashboard right now. Showing available data.');
        }
        setProfile(null);
      }

      setConsultations(consultationRes.status === 'fulfilled' ? consultationRes.value?.data || [] : []);
      setClinics(clinicsRes.status === 'fulfilled' ? clinicsRes.value?.data || [] : []);

      setLoading(false);
    };

    load();
  }, [location.key]);

  const now = Date.now();

  const stats = useMemo(() => {
    const total = consultations.length;
    const completed = consultations.filter((item) => String(item.status).toLowerCase() === 'completed').length;
    const inProgress = consultations.filter((item) => String(item.status).toLowerCase() === 'in_progress').length;
    const upcoming = consultations.filter((item) => {
      const t = new Date(item.consultation_date).getTime();
      return !Number.isNaN(t) && t >= now;
    }).length;

    return { total, completed, inProgress, upcoming };
  }, [consultations, now]);

  const monthlyConsultations = useMemo(() => {
    const monthMap = new Map(MONTH_LABELS.map((m) => [m, 0]));
    consultations.forEach((item) => {
      const date = new Date(item.consultation_date);
      if (!Number.isNaN(date.getTime())) {
        const m = MONTH_LABELS[date.getMonth()];
        monthMap.set(m, (monthMap.get(m) || 0) + 1);
      }
    });

    return Array.from(monthMap.entries()).map(([month, consultationsCount]) => ({
      month,
      consultations: consultationsCount,
    }));
  }, [consultations]);

  const trendData = useMemo(() => {
    if (!consultations.length) return [];

    return consultations
      .slice(0, 18)
      .reverse()
      .map((item, index) => ({
        slot: index + 1,
        load: item.status === 'completed' ? 72 + index * 4 : 58 + index * 3,
      }));
  }, [consultations]);

  const recentActivity = useMemo(
    () => consultations.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.patient_name || 'Consultation',
      subtitle: `${titleCase(item.status)} • ${formatDate(item.consultation_date)}`,
    })),
    [consultations]
  );

  return (
    <section className="patient-overview-luxe">
      <div className="luxe-top-grid">
        <article className="luxe-card luxe-intro-card">
          <div className="luxe-intro-icon" aria-hidden="true">
            <Stethoscope size={16} />
          </div>

          <h3>{profile?.full_name ? `Welcome, Dr. ${profile.full_name.split(' ')[0]}` : 'Build Your Doctor Workspace'}</h3>
          <p>
            {profile
              ? 'Review consultation workload, clinic setup, and patient activity from a single command center.'
              : 'Create your doctor profile to unlock consultation, clinic, and emergency tools.'}
          </p>

          {profile ? (
            <div className="luxe-chip-row">
              <span>{stats.total} Consultations</span>
              <span>{stats.inProgress} In Progress</span>
              <span>{profile?.is_verified ? 'Verified' : 'Pending Verification'}</span>
            </div>
          ) : (
            <Link to="/dashboard/doctor/profile" className="luxe-primary-cta">
              Create profile <ArrowUpRight size={14} />
            </Link>
          )}
        </article>

        <article className="luxe-card luxe-doctors-card">
          <div className="luxe-card-head">
            <h3>Practice Snapshot</h3>
            <Link to="/dashboard/doctor/clinics" className="luxe-inline-link">
              Manage
            </Link>
          </div>

          <div className="luxe-list">
            <div className="luxe-list-row">
              <div className="luxe-avatar-sm"><ClipboardCheck size={14} /></div>
              <div>
                <strong>{stats.completed} Completed Cases</strong>
                <p>Clinical outcomes logged</p>
              </div>
            </div>

            <div className="luxe-list-row">
              <div className="luxe-avatar-sm"><UserRoundCog size={14} /></div>
              <div>
                <strong>{profile?.is_verified ? 'Account Verified' : 'Verification Pending'}</strong>
                <p>Doctor profile status</p>
              </div>
            </div>

            <div className="luxe-list-row">
              <div className="luxe-avatar-sm"><Activity size={14} /></div>
              <div>
                <strong>{clinics.length} Clinic Locations</strong>
                <p>Available for consultation and emergency</p>
              </div>
            </div>
          </div>
        </article>

        <article className="luxe-card luxe-revenue-card">
          <div className="luxe-card-head">
            <h3>Monthly Load</h3>
            <span className="luxe-badge">Consults</span>
          </div>

          <div className="luxe-small-chart">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={monthlyConsultations}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="consultations" radius={[8, 8, 8, 8]} fill="url(#doctorMonthlyGradient)" />
                <defs>
                  <linearGradient id="doctorMonthlyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#93d88a" />
                    <stop offset="100%" stopColor="#89a2ea" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="luxe-bottom-grid">
        <article className="luxe-card luxe-trend-card">
          <div className="luxe-card-head">
            <h3>Consultation Intensity</h3>
            <div className="luxe-head-meta">
              <span>{stats.total} Total</span>
              <span>{stats.upcoming} Upcoming</span>
            </div>
          </div>

          {trendData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#ecece4" />
                <XAxis dataKey="slot" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="load"
                  stroke="#86c881"
                  fill="url(#doctorVisitsGradient)"
                  strokeWidth={2.5}
                />
                <defs>
                  <linearGradient id="doctorVisitsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b9e7b2" stopOpacity={0.75} />
                    <stop offset="100%" stopColor="#b9e7b2" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="luxe-empty-large">
              <Waves size={24} />
              <p>No consultation trend data yet.</p>
            </div>
          )}
        </article>

        <article className="luxe-card luxe-activity-card">
          <div className="luxe-card-head">
            <h3>Recent Activity</h3>
            <Link to="/dashboard/doctor/consultations" className="luxe-inline-link">
              See all
            </Link>
          </div>

          {recentActivity.length ? (
            <div className="luxe-activity-list">
              {recentActivity.map((item) => (
                <div key={item.id} className="luxe-activity-row">
                  <div className="luxe-activity-dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="luxe-empty-mini">
              <CalendarClock size={18} />
              <p>No consultations yet</p>
              <Link to="/dashboard/doctor/consultations">Start consultation -&gt;</Link>
            </div>
          )}

          <div className="luxe-activity-footer">
            <div>
              <p>Status</p>
              <strong>{loading ? 'Loading' : 'Synced'}</strong>
            </div>
            <div>
              <p>Notice</p>
              <strong>{notice ? 'Partial sync' : 'None'}</strong>
            </div>
          </div>
        </article>
      </div>

      {notice ? <p className="patient-soft-error">{notice}</p> : null}
    </section>
  );
}

export default DoctorOverviewPage;
