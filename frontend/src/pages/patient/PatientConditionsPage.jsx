import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, ClipboardList, PencilLine, ShieldCheck, Trash2 } from 'lucide-react';
import {
  createChronicCondition,
  deleteChronicCondition,
  getChronicConditions,
  updateChronicCondition,
} from '../../api/patients';
import { LuxeDateField } from '../../components/common/LuxeDatePickers';
import { formatDate, titleCase, toDateInputValue } from '../../utils/formatters';

const INITIAL_FORM = { condition_name: '', status: 'active', diagnosed_date: '' };

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
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState('');
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

  const reset = () => {
    setForm(INITIAL_FORM);
    setEditingId('');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setNotice({ type: '', text: '' });
    try {
      if (editingId) {
        await updateChronicCondition(editingId, form);
      } else {
        await createChronicCondition(form);
      }
      reset();
      setNotice({ type: 'success', text: editingId ? 'Condition updated.' : 'Condition added.' });
      load();
    } catch (e) {
      setNotice({ type: 'error', text: getFriendlyMessage(e, 'Unable to save condition right now.') });
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this chronic condition?')) return;
    try {
      await deleteChronicCondition(id);
      setNotice({ type: 'success', text: 'Condition deleted.' });
      load();
    } catch (e) {
      setNotice({ type: 'error', text: getFriendlyMessage(e, 'Unable to delete condition right now.') });
    }
  };

  const activeCount = items.filter((item) => item.status === 'active').length;
  const managedCount = items.filter((item) => item.status === 'managed').length;
  const resolvedCount = items.filter((item) => item.status === 'resolved').length;

  return (
    <section className="patient-page-luxe">
      <div className="panel luxe-section-card">
        <div className="panel-head">
          <h3>{editingId ? 'Edit Chronic Condition' : 'Add Chronic Condition'}</h3>
          <span className="luxe-pill-tag">Long-term History</span>
        </div>

        <p className="patient-inline-note">
          Keep your long-term health history current so doctors can tailor safer treatment plans.
        </p>

        <form className="inline-form" onSubmit={onSubmit}>
          <input
            placeholder="Condition Name"
            value={form.condition_name}
            onChange={(e) => setForm((prev) => ({ ...prev, condition_name: e.target.value }))}
            required
          />
          <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="managed">Managed</option>
            <option value="resolved">Resolved</option>
          </select>
          <LuxeDateField
            value={form.diagnosed_date}
            onChange={(value) => setForm((prev) => ({ ...prev, diagnosed_date: value }))}
            placeholder="Diagnosed date"
          />
          <button className="submit-btn slim" type="submit">
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId ? (
            <button type="button" className="text-btn" onClick={reset}>
              Cancel
            </button>
          ) : null}
        </form>

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

                <div className="condition-record-actions">
                  <button
                    type="button"
                    className="condition-action-btn"
                    onClick={() => {
                      setEditingId(item.id);
                      setForm({
                        condition_name: item.condition_name,
                        status: item.status,
                        diagnosed_date: toDateInputValue(item.diagnosed_date),
                      });
                    }}
                  >
                    <PencilLine size={14} /> Edit
                  </button>
                  <button type="button" className="condition-action-btn danger" onClick={() => onDelete(item.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
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
