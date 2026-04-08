import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Sparkles, UserRoundPen } from 'lucide-react';
import { createDoctorProfile, getDoctorProfile, updateDoctorProfile } from '../../api/doctors';

const INITIAL_FORM = {
  full_name: '',
  license_number: '',
  specialization: '',
};

function toFriendlyMessage(error, fallback) {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;

  if (status === 400 || code === 'VALIDATION_ERROR') return 'Please check the profile details and try again.';
  if (status === 409 || code === 'CONFLICT') return 'A doctor profile with this license already exists.';
  return fallback;
}

function DoctorProfilePage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [initialForm, setInitialForm] = useState(INITIAL_FORM);
  const [profileExists, setProfileExists] = useState(true);
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState('-');
  const [phone, setPhone] = useState('-');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setNotice({ type: '', text: '' });
    try {
      const response = await getDoctorProfile();
      const data = response?.data || {};
      const nextForm = {
        full_name: data.full_name || '',
        license_number: data.license_number || '',
        specialization: data.specialization || '',
      };
      setForm(nextForm);
      setInitialForm(nextForm);
      setProfileExists(true);
      setVerified(Boolean(data.is_verified));
      setEmail(data.email || '-');
      setPhone(data.phone || '-');
    } catch (e) {
      const status = e?.response?.status;
      const code = e?.response?.data?.error?.code;
      if (status === 404 && code === 'NOT_FOUND') {
        setProfileExists(false);
        setForm(INITIAL_FORM);
        setInitialForm(INITIAL_FORM);
      } else {
        setNotice({ type: 'error', text: 'Unable to load doctor profile right now.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);
  const canCreate = Boolean(form.full_name.trim() && form.license_number.trim());

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice({ type: '', text: '' });

    try {
      if (profileExists) {
        const response = await updateDoctorProfile({
          full_name: form.full_name,
          specialization: form.specialization,
        });
        const updated = response?.data || {};
        const nextForm = {
          full_name: updated.full_name || form.full_name,
          license_number: updated.license_number || form.license_number,
          specialization: updated.specialization || '',
        };
        setForm(nextForm);
        setInitialForm(nextForm);
        setVerified(Boolean(updated.is_verified));
        setNotice({ type: 'success', text: 'Doctor profile updated.' });
      } else {
        const response = await createDoctorProfile(form);
        const created = response?.data || {};
        const nextForm = {
          full_name: created.full_name || form.full_name,
          license_number: created.license_number || form.license_number,
          specialization: created.specialization || '',
        };
        setForm(nextForm);
        setInitialForm(nextForm);
        setProfileExists(true);
        setVerified(Boolean(created.is_verified));
        setNotice({ type: 'success', text: 'Doctor profile created.' });
      }
    } catch (e) {
      setNotice({ type: 'error', text: toFriendlyMessage(e, 'Unable to save doctor profile right now.') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="patient-empty">Loading profile...</p>;
  }

  return (
    <section className="doctor-profile-grid">
      <article className="doctor-card doctor-profile-identity-card">
        <div className="doctor-profile-shell">
          <div className="doctor-profile-head">
            <div className="doctor-profile-avatar">{form.full_name?.charAt(0) || 'D'}</div>
            <div>
              <p className="doctor-profile-kicker">Doctor Identity</p>
              <h3>{form.full_name || 'Your profile'}</h3>
              <p className="doctor-profile-sub">License: {form.license_number || 'Not set'}</p>
            </div>
          </div>

          <div className="doctor-profile-accent">
            <Sparkles size={15} />
            <p>Keep profile details updated for seamless consultation and prescription workflows.</p>
          </div>
        </div>

        <div className="doctor-contact-list">
          <p><span>Email</span><strong>{email}</strong></p>
          <p><span>Phone</span><strong>{phone}</strong></p>
          <p>
            <span>Verification</span>
            <strong className="patient-inline-good"><ShieldCheck size={14} /> {verified ? 'Verified' : 'Pending'}</strong>
          </p>
        </div>
      </article>

      <article className="doctor-card doctor-profile-form-card">
        <div className="panel-head split">
          <h3>{profileExists ? 'Edit Doctor Profile' : 'Create Doctor Profile'}</h3>
          <span className="profile-chip">
            <UserRoundPen size={14} /> {profileExists ? 'Editable' : 'New Profile'}
          </span>
        </div>

        <form className="doctor-form-grid" onSubmit={onSubmit}>
          <label>
            Full Name
            <input value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} />
          </label>

          <label>
            License Number
            <input
              value={form.license_number}
              onChange={(e) => setForm((prev) => ({ ...prev, license_number: e.target.value }))}
              disabled={profileExists}
            />
          </label>

          <label>
            Specialization
            <input
              value={form.specialization}
              onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
              placeholder="e.g., Cardiology"
            />
          </label>

          <div className="doctor-form-actions">
            <button
              className="submit-btn slim"
              type="submit"
              disabled={saving || (profileExists ? !hasChanges : !canCreate)}
            >
              {saving ? 'Saving...' : profileExists ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </form>

        {notice.text ? (
          <p className={notice.type === 'error' ? 'patient-soft-error' : 'patient-soft-success'}>
            {notice.type === 'success' ? <CheckCircle2 size={14} /> : null}
            {notice.text}
          </p>
        ) : null}
      </article>
    </section>
  );
}

export default DoctorProfilePage;
