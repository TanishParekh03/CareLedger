import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, ClipboardList, ShieldCheck } from 'lucide-react';
import {
  getChronicConditions,
} from '../../api/patients';
import { formatDate, titleCase } from '../../utils/formatters';

function getFriendlyMessage(error, fallback) {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;

  if (status === 404) return '';
  if (status === 400 || code === 'VALIDATION_ERROR') return 'Please review condition details and try again.';
  if (status === 409 || code === 'CONFLICT') return 'This condition already exists in your records.';
  return fallback;
}

function PatientConditionsPage() {
  const [items, setItems] = useState([]);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setNotice({ type: '', text: '' });
    try {
      const response = await getChronicConditions();
      setItems(response?.data || []);
    } catch (e) {
      setItems([]);
      const message = getFriendlyMessage(e, 'Unable to load condition records right now.');
      if (message) {
        setNotice({ type: 'error', text: message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeCount = items.filter((item) => item.status === 'active').length;
  const managedCount = items.filter((item) => item.status === 'managed').length;
  const resolvedCount = items.filter((item) => item.status === 'resolved').length;

  return (
    <section className="patient-page-luxe">
      <div className="panel luxe-section-card">
        <div className="panel-head">
          <h3>Chronic Conditions</h3>
          <span className="luxe-pill-tag">Long-term History</span>
        </div>

        <p className="patient-inline-note">
          Your chronic conditions are managed by your doctors. Contact your doctor to update this information.
        </p>

        {/* ── Add/Edit form removed — patients should not add chronic conditions ── */}

        <div className="luxe-chip-row">
          <span>{activeCount} Active</span>
          <span>{managedCount} Managed</span>
          <span>{resolvedCount} Resolved</span>
        </div>
      </div>

      <div className="panel luxe-section-card">
        <div className="panel-head">
          <h3>Condition Records</h3>
          <span className="luxe-subtle-count">{items.length} items</span>
        </div>

        {loading ? <p className="muted">Loading conditions...</p> : null}

        {!loading && items.length === 0 ? (
          <div className="luxe-empty-mini">
            <ClipboardList size={18} />
            <p>No chronic conditions recorded yet.</p>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="condition-records-grid">
            {items.map((item) => (
              <article key={item.id} className="condition-record-card">
                <div className="condition-record-head">
                  <div className="condition-record-icon" aria-hidden="true">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h4>{item.condition_name}</h4>
                    <p>Tracked in your long-term history</p>
                  </div>
                </div>

                <div className="condition-meta-row">
                  <span
                    className={`status-pill ${
                      item.status === 'active' ? 'success' : item.status === 'managed' ? 'warn' : 'neutral'
                    }`}
                  >
                    {titleCase(item.status)}
                  </span>
                  <span className="condition-date-chip">
                    <CalendarDays size={13} /> {item.diagnosed_date ? formatDate(item.diagnosed_date) : 'Date not set'}
                  </span>
                </div>

                {/* ── Edit/Delete actions removed — read-only for patients ── */}
              </article>
            ))}
          </div>
        ) : null}
      </div>

      {notice.text ? (
        <p className={notice.type === 'error' ? 'patient-soft-error' : 'patient-soft-success'}>
          {notice.type === 'error' ? <AlertTriangle size={14} /> : null}
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}

export default PatientConditionsPage;
