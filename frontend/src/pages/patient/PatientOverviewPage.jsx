import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarClock, Stethoscope, UserPlus2, Waves } from 'lucide-react';
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
import {
  getAllergies,
  getChronicConditions,
  getOwnPatientProfile,
  getPatientAccessList,
  getPatientConsultations,
} from '../../api/patients';
import { formatDate, titleCase } from '../../utils/formatters';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

function PatientOverviewPage() {
  const profileQuery = useQuery({ queryKey: ['patient-profile'], queryFn: getOwnPatientProfile });
  const consultQuery = useQuery({ queryKey: ['patient-consultations'], queryFn: getPatientConsultations });
  const allergyQuery = useQuery({ queryKey: ['patient-allergies'], queryFn: getAllergies });
  const conditionQuery = useQuery({ queryKey: ['patient-conditions'], queryFn: getChronicConditions });
  const accessQuery = useQuery({ queryKey: ['patient-access-list'], queryFn: getPatientAccessList });

  const loading = profileQuery.isLoading || consultQuery.isLoading || allergyQuery.isLoading || conditionQuery.isLoading || accessQuery.isLoading;
  const error = (profileQuery.error && profileQuery.error?.response?.status !== 404) ? 'Unable to fully sync overview right now. Showing available data.' : '';

  const profile = profileQuery.data?.data || null;
  const consultations = consultQuery.data?.data || [];
  const allergies = allergyQuery.data?.data || [];
  const conditions = conditionQuery.data?.data || [];
  const accessList = accessQuery.data?.data || [];

  const activeAccessDoctors = useMemo(
    () => accessList.filter((row) => String(row.status).toLowerCase() === 'active'),
    [accessList]
  );

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
        visits: item.status === 'completed' ? 80 + index * 5 : 55 + index * 4,
      }));
  }, [consultations]);

  const recentActivity = useMemo(
    () => consultations.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.doctor_name || 'Consultation',
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

          <h3>{profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Unlock Health Insights'}</h3>
          <p>
            {profile
              ? 'Your health records are synchronized. Review access grants, consultations, and trends in one place.'
              : 'Complete your profile to unlock consultation tracking, access management, and personalized insights.'}
          </p>

          {profile ? (
            <div className="luxe-chip-row">
              <span>{conditions.length} Conditions</span>
              <span>{allergies.length} Allergies</span>
              <span>{activeAccessDoctors.length} Active Doctors</span>
            </div>
          ) : (
            <Link to="/dashboard/patient/profile" className="luxe-primary-cta">
              Complete your profile <ArrowUpRight size={14} />
            </Link>
          )}
        </article>

        <article className="luxe-card luxe-doctors-card">
          <div className="luxe-card-head">
            <h3>Active Doctors</h3>
            <Link to="/dashboard/patient/access" className="luxe-inline-link">
              Manage
            </Link>
          </div>

          {activeAccessDoctors.length ? (
            <div className="luxe-list">
              {activeAccessDoctors.slice(0, 4).map((doctor, index) => (
                <div key={doctor.id || `${doctor.doctor_id}-${index}`} className="luxe-list-row">
                  <div className="luxe-avatar-sm">{(doctor.doctor_name || 'D').charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{doctor.doctor_name || doctor.doctor_id?.slice(0, 8) || 'Doctor'}</strong>
                    <p>Expires: {doctor.expires_at ? formatDate(doctor.expires_at) : 'No expiry'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="luxe-empty-mini">
              <UserPlus2 size={18} />
              <p>No active doctors yet</p>
              <Link to="/dashboard/patient/access">Grant access -&gt;</Link>
            </div>
          )}
        </article>

        <article className="luxe-card luxe-revenue-card">
          <div className="luxe-card-head">
            <h3>Consultation Trend</h3>
            <span className="luxe-badge">Monthly</span>
          </div>

          <div className="luxe-small-chart">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={monthlyConsultations}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="consultations" radius={[8, 8, 8, 8]} fill="url(#monthlyGradient)" />
                <defs>
                  <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8fdd87" />
                    <stop offset="100%" stopColor="#8ea6ef" />
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
            <h3>Total Patient Visits</h3>
            <div className="luxe-head-meta">
              <span>{consultations.length} Visits</span>
              <span>{activeAccessDoctors.length} Active Doctors</span>
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
                  dataKey="visits"
                  stroke="#89cf84"
                  fill="url(#visitsGradient)"
                  strokeWidth={2.5}
                />
                <defs>
                  <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
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
            <Link to="/dashboard/patient/consultations" className="luxe-inline-link">
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
              <Link to="/dashboard/patient/access">Start by granting access -&gt;</Link>
            </div>
          )}

          <div className="luxe-activity-footer">
            <div>
              <p>Status</p>
              <strong>{loading ? 'Loading' : 'Synced'}</strong>
            </div>
            <div>
              <p>Error</p>
              <strong>{error ? 'Partial sync' : 'None'}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default PatientOverviewPage;
