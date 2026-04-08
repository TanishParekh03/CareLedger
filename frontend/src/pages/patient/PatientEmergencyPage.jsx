import { useEffect, useState } from 'react';
import { AlertTriangle, Mail, PencilLine, Phone, ShieldAlert, Trash2, Users } from 'lucide-react';
import {
  createEmergencyInfo,
  deleteEmergencyInfo,
  getEmergencyInfo,
  updateEmergencyInfo,
} from '../../api/patients';

const INITIAL_FORM = {
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  contact_relationship: '',
};

function PatientEmergencyPage() {
  const [contacts, setContacts] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  const getFriendlyMessage = (error, fallback) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.error?.code;

    if (status === 404) return '';
    if (status === 400 || code === 'VALIDATION_ERROR') return 'Please check contact details and try again.';
    return fallback;
  };

  const load = async () => {
    setLoading(true);
    setNotice({ type: '', text: '' });
    try {
      const response = await getEmergencyInfo();
      const details = response?.data?.emergency_details || [];
      setContacts(details);
    } catch (e) {
      setContacts([]);
      const message = getFriendlyMessage(e, 'Unable to load emergency contacts right now.');
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
        await updateEmergencyInfo(editingId, form);
        setNotice({ type: 'success', text: 'Emergency contact updated.' });
      } else {
        await createEmergencyInfo(form);
        setNotice({ type: 'success', text: 'Emergency contact added.' });
      }
      reset();
      load();
    } catch (e) {
      setNotice({ type: 'error', text: getFriendlyMessage(e, 'Unable to save emergency contact right now.') });
    }
  };

  const onDelete = async (target) => {
    if (!target?.id) {
      setNotice({ type: 'error', text: 'Unable to delete this contact right now.' });
      return;
    }
    if (!window.confirm('Delete this emergency contact?')) return;

    try {
      await deleteEmergencyInfo(target.id);
      setNotice({ type: 'success', text: 'Emergency contact removed.' });
      load();
    } catch (e) {
      setNotice({ type: 'error', text: getFriendlyMessage(e, 'Unable to delete emergency contact right now.') });
    }
  };

  const familyCount = contacts.filter((item) => (item.contact_relationship || '').toLowerCase() !== 'doctor').length;

  return (
    <section className="patient-page-luxe">
      <div className="panel luxe-section-card">
        <div className="panel-head">
          <h3>{editingId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}</h3>
          <span className="luxe-pill-tag">Emergency Chain</span>
        </div>

        <p className="patient-inline-note">
          These contacts may be used during urgent clinical situations. Keep details accurate and reachable.
        </p>

        <form className="inline-form" onSubmit={onSubmit}>
          <input
            placeholder="Contact Name"
            value={form.contact_name}
            onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
            required
          />
          <input
            placeholder="Phone"
            value={form.contact_phone}
            onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.contact_email}
            onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
            required
          />
          <input
            placeholder="Relationship"
            value={form.contact_relationship}
            onChange={(e) => setForm((prev) => ({ ...prev, contact_relationship: e.target.value }))}
          />
          <button className="submit-btn slim" type="submit">
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId ? (
            <button className="text-btn" type="button" onClick={reset}>
              Cancel
            </button>
          ) : null}
        </form>

        <div className="luxe-chip-row">
          <span>{contacts.length} Contacts</span>
          <span>{familyCount} Family / Friends</span>
        </div>
      </div>

      <div className="panel luxe-section-card">
        <div className="panel-head">
          <h3>Emergency Contacts</h3>
          <span className="luxe-subtle-count">{contacts.length} items</span>
        </div>

        {loading ? <p className="muted">Loading emergency contacts...</p> : null}

        {!loading && contacts.length === 0 ? (
          <div className="luxe-empty-mini">
            <Users size={18} />
            <p>No emergency contacts yet.</p>
          </div>
        ) : null}

        {contacts.length > 0 ? (
          <div className="emergency-records-grid">
            {contacts.map((item, index) => (
              <article className="emergency-record-card" key={item.id || `${item.emergency_email}-${index}`}>
                <div className="emergency-record-head">
                  <div className="emergency-record-icon" aria-hidden="true">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h4>{item.emergency_name}</h4>
                    <p>{item.contact_relationship || 'Relationship not set'}</p>
                  </div>
                </div>

                <div className="emergency-contact-list">
                  <p>
                    <Phone size={13} /> {item.emergency_phone_number || '-'}
                  </p>
                  <p>
                    <Mail size={13} /> {item.emergency_email || '-'}
                  </p>
                </div>

                <div className="emergency-record-actions">
                  <button
                    className="emergency-action-btn"
                    type="button"
                    onClick={() => {
                      setEditingId(item.id || '');
                      setForm({
                        contact_name: item.emergency_name || '',
                        contact_phone: item.emergency_phone_number || '',
                        contact_email: item.emergency_email || '',
                        contact_relationship: item.contact_relationship || '',
                      });
                    }}
                  >
                    <PencilLine size={14} /> Edit
                  </button>
                  <button className="emergency-action-btn danger" type="button" onClick={() => onDelete(item)}>
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

export default PatientEmergencyPage;
