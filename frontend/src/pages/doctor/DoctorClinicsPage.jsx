import { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Mail, MapPin, PencilLine, Phone, Trash2 } from 'lucide-react';
import { createClinic, deleteClinic, getDoctorClinics, updateClinic } from '../../api/clinics';

const INITIAL_FORM = {
  clinicName: '',
  address: '',
  logoURL: '',
  email: '',
  phone: '',
};

function toFriendlyMessage(error, fallback) {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;

  if (status === 400 || code === 'VALIDATION_ERROR') return 'Please check clinic details and try again.';
  if (status === 403 || code === 'FORBIDDEN') return 'Clinic management is available after doctor verification.';
  if (status === 409 || code === 'CONFLICT') return 'A clinic with the same name and address already exists.';
  return fallback;
}

function DoctorClinicsPage() {
  const [clinics, setClinics] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [notice, setNotice] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setNotice({ type: '', text: '' });
    try {
      const response = await getDoctorClinics();
      setClinics(response?.data || []);
    } catch (e) {
      setClinics([]);
      setNotice({ type: 'error', text: toFriendlyMessage(e, 'Unable to load clinics right now.') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId('');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice({ type: '', text: '' });

    try {
      if (editingId) {
        await updateClinic(editingId, form);
        setNotice({ type: 'success', text: 'Clinic updated successfully.' });
      } else {
        await createClinic(form);
        setNotice({ type: 'success', text: 'Clinic added successfully.' });
      }
      resetForm();
      load();
    } catch (e) {
      setNotice({ type: 'error', text: toFriendlyMessage(e, 'Unable to save clinic right now.') });
    } finally {
      setSaving(false);
    }
  };

  const onDeleteClinic = async (id) => {
    const confirmed = window.confirm('Delete this clinic? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setNotice({ type: '', text: '' });

    try {
      await deleteClinic(id);
      if (editingId === id) {
        resetForm();
      }
      setNotice({ type: 'success', text: 'Clinic deleted successfully.' });
      load();
    } catch (e) {
      setNotice({ type: 'error', text: toFriendlyMessage(e, 'Unable to delete clinic right now.') });
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="doctor-page-luxe">
      <article className="doctor-card">
        <div className="panel-head">
          <h3>{editingId ? 'Update Clinic' : 'Add New Clinic'}</h3>
          <span className="luxe-pill-tag">Practice Setup</span>
        </div>

        <p className="patient-inline-note">
          Keep clinic details current so patient communication and emergency handoffs remain accurate.
        </p>

        <form className="doctor-form-grid" onSubmit={onSubmit}>
          <label>
            Clinic Name
            <input
              value={form.clinicName}
              onChange={(e) => setForm((prev) => ({ ...prev, clinicName: e.target.value }))}
              required
            />
          </label>

          <label>
            Contact Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </label>

          <label>
            Address
            <input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              required
            />
          </label>

          <label>
            Contact Phone
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              required
            />
          </label>

          <label>
            Logo URL (optional)
            <input
              value={form.logoURL}
              onChange={(e) => setForm((prev) => ({ ...prev, logoURL: e.target.value }))}
            />
          </label>

          <div className="doctor-form-actions">
            <button className="submit-btn slim" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Clinic' : 'Add Clinic'}
            </button>
            {editingId ? (
              <button className="patient-secondary-btn" type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </article>

      <article className="doctor-card">
        <div className="panel-head">
          <h3>Clinics</h3>
          <span className="luxe-subtle-count">{clinics.length} items</span>
        </div>

        {loading ? <p className="muted">Loading clinics...</p> : null}

        {!loading && clinics.length === 0 ? (
          <div className="luxe-empty-mini">
            <Building2 size={18} />
            <p>No clinics added yet.</p>
          </div>
        ) : null}

        {clinics.length > 0 ? (
          <div className="clinic-records-grid">
            {clinics.map((clinic) => (
              <article key={clinic.id} className="clinic-record-card">
                <div className="clinic-record-head">
                  <div className="clinic-record-icon" aria-hidden="true">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h4>{clinic.clinic_name}</h4>
                    <p>Practice Location</p>
                  </div>
                </div>

                <div className="clinic-contact-list">
                  <p><MapPin size={13} /> {clinic.address || '-'}</p>
                  <p><Mail size={13} /> {clinic.email || '-'}</p>
                  <p><Phone size={13} /> {clinic.phone || '-'}</p>
                </div>

                <div className="clinic-record-actions">
                  <button
                    type="button"
                    className="clinic-action-btn"
                    onClick={() => {
                      setEditingId(clinic.id);
                      setForm({
                        clinicName: clinic.clinic_name || '',
                        address: clinic.address || '',
                        logoURL: clinic.logo_url || '',
                        email: clinic.email || '',
                        phone: clinic.phone || '',
                      });
                    }}
                  >
                    <PencilLine size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className="clinic-action-btn danger"
                    onClick={() => onDeleteClinic(clinic.id)}
                    disabled={deletingId === clinic.id}
                  >
                    <Trash2 size={14} /> {deletingId === clinic.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </article>

      {notice.text ? (
        <p className={notice.type === 'error' ? 'patient-soft-error' : 'patient-soft-success'}>
          {notice.type === 'error' ? <AlertTriangle size={14} /> : null}
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}

export default DoctorClinicsPage;
