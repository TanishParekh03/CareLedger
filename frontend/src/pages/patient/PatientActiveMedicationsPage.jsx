import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, ClipboardList, Pill, UserRound } from 'lucide-react';
import { getActiveMedications } from '../../api/patients';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';

function getFriendlyMessage(error, fallback) {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;

  if (status === 404) return '';
  if (status === 400 || code === 'VALIDATION_ERROR') return 'Unable to load active medications for this account.';
  if (status === 403 || code === 'FORBIDDEN') return 'You are not allowed to view this medication list.';
  return fallback;
}

function PatientActiveMedicationsPage() {
  const { auth } = useAuth();
  const {
    data: medicationsRes,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['patient-active-medications', auth?.userId],
    queryFn: () => getActiveMedications(auth.userId),
    enabled: Boolean(auth?.userId),
  });

  const items = medicationsRes?.data || [];
  const noticeText = !auth?.userId
    ? 'Unable to identify your account. Please sign in again.'
    : error
      ? getFriendlyMessage(error, 'Unable to load active medications right now.')
      : '';

  const uniqueDoctors = new Set(items.map((item) => item.doctor_name).filter(Boolean)).size;

  return (
    <section className="patient-page-luxe">
      <div className="panel luxe-section-card">
        <div className="panel-head">
          <h3>Active Medications</h3>
          <span className="luxe-pill-tag">Read-Only</span>
        </div>

        <p className="patient-inline-note">
          This list is managed by your doctors and reflects your currently active prescriptions.
        </p>

        <div className="luxe-chip-row">
          <span>{items.length} Active Items</span>
          <span>{uniqueDoctors} Prescribing Doctors</span>
        </div>
      </div>

      <div className="panel luxe-section-card active-medications-card">
        <div className="panel-head split">
          <h3>Medication Records</h3>
          <span className="luxe-subtle-count">{items.length} rows</span>
        </div>

        {loading ? <p className="muted">Loading active medications...</p> : null}

        {!loading && items.length === 0 ? (
          <div className="luxe-empty-mini">
            <ClipboardList size={18} />
            <p>No active medication records found.</p>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="active-medications-table-wrap">
            <table className="table active-medications-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Name</th>
                  <th>Dosage</th>
                  <th>Prescribed By</th>
                  <th>Prescribed For</th>
                  <th>Prescribed At</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <span className="active-medications-sn">
                        <Pill size={13} /> {index + 1}
                      </span>
                    </td>
                    <td>{item.name}</td>
                    <td>{item.dosage}</td>
                    <td>
                      <span className="active-medications-doctor">
                        <UserRound size={13} /> {item.doctor_name || 'Doctor'}
                      </span>
                    </td>
                    <td>{item.prescibed_for}</td>
                    <td>
                      <span className="active-medications-date">
                        <CalendarDays size={13} /> {formatDate(item.prescibed_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {noticeText ? (
        <p className="patient-soft-error">
          <AlertTriangle size={14} />
          {noticeText}
        </p>
      ) : null}
    </section>
  );
}

export default PatientActiveMedicationsPage;
