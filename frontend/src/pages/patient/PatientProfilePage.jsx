import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Mail,
  Phone,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  UserRoundPen,
} from 'lucide-react';
import {
  createPatientProfile,
  getOwnPatientProfile,
  updateOwnPatientProfile,
} from '../../api/patients';
import { LuxeDateField } from '../../components/common/LuxeDatePickers';
import { useLocation } from 'react-router-dom';
import { toDateInputValue } from '../../utils/formatters';

const INITIAL_STATE = {
  full_name: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
};

function PatientProfilePage() {
  const location = useLocation();
  const [form, setForm] = useState(INITIAL_STATE);
  const [healthIdInput, setHealthIdInput] = useState('');
  const [initialForm, setInitialForm] = useState(INITIAL_STATE);
  const [healthId, setHealthId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileExists, setProfileExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const applyProfileData = (data) => {
    const nextForm = {
      full_name: data.full_name || '',
      date_of_birth: toDateInputValue(data.date_of_birth),
      gender: data.gender || '',
      blood_group: data.blood_group || '',
    };

    setForm(nextForm);
    setInitialForm(nextForm);
    setHealthId(data.health_id || 'Not set');
    setHealthIdInput(data.health_id || '');
    setEmail(data.email || '-');
    setPhone(data.phone || '-');
  };

  const loadProfile = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError('');
    try {
      const response = await getOwnPatientProfile();
      const data = response?.data || {};
      setProfileExists(true);
      applyProfileData(data);
    } catch (e) {
      const status = e?.response?.status;
      const apiCode = e?.response?.data?.error?.code;

      // First-time patients should see onboarding state instead of a red server error.
      if (status === 404 && apiCode === 'NOT_FOUND') {
        setProfileExists(false);
        setError('');
      } else {
        setError(e?.userMessage || 'Unable to load profile right now. Please retry.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadProfile();
  }, [location.key]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!profileExists) {
        const created = await createPatientProfile({
          ...form,
          health_id: healthIdInput,
        });
        setProfileExists(true);
        applyProfileData({
          ...created?.data,
          email,
          phone,
        });
        setMessage('Profile created successfully.');
      } else {
        const updated = await updateOwnPatientProfile(form);
        applyProfileData({
          ...updated?.data,
          email,
          phone,
        });
        setMessage('Profile updated successfully.');
      }
    } catch (e) {
      setError(e?.userMessage || 'Could not save profile. Please check inputs and retry.');
    } finally {
      setSaving(false);
    }
  };

  const completionFields = [form.full_name, form.date_of_birth, form.gender, form.blood_group].filter(Boolean).length;
  const completionPercent = Math.round((completionFields / 4) * 100);
  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);
  const canCreate = Boolean(form.full_name.trim() && healthIdInput.trim());

  if (loading) {
    return <p className="patient-empty">Loading profile...</p>;
  }

  return (
    <section className="patient-profile-v2-grid">
      <article className="patient-profile-identity-card">
        <div className="patient-profile-visual-shell">
          <div className="patient-profile-identity-head">
            <div className="patient-profile-avatar-lg">{form.full_name?.charAt(0) || 'P'}</div>
            <div>
              <p className="patient-profile-kicker">Profile Identity</p>
              <h3>{form.full_name || 'Your profile'}</h3>
              <p className="patient-profile-sub">Health ID: {healthId}</p>
            </div>
          </div>

          <div className="patient-profile-accent">
            <Sparkles size={15} />
            <p>Keep this profile updated for safer emergency care and faster doctor consultations.</p>
          </div>
        </div>

        <div className="patient-profile-completion">
          <div>
            <p>Profile Completion</p>
            <strong>{completionPercent}%</strong>
          </div>
          <div className="patient-progress-track" aria-hidden="true">
            <span style={{ width: `${completionPercent}%` }} />
          </div>
        </div>

        <div className="patient-contact-list">
          <p>
            <span>Email</span>
            <strong className="patient-contact-strong">
              <Mail size={13} /> {email}
            </strong>
          </p>
          <p>
            <span>Phone</span>
            <strong className="patient-contact-strong">
              <Phone size={13} /> {phone}
            </strong>
          </p>
          <p>
            <span>Security</span>
            <strong className="patient-inline-good">
              <ShieldCheck size={14} /> Verified Access
            </strong>
          </p>
        </div>
      </article>

      <article className="patient-profile-form-card">
        <div className="panel-head split">
          <h3>{profileExists ? 'Edit Medical Profile' : 'Create Medical Profile'}</h3>
          <span className="profile-chip">
            {profileExists ? <UserRoundPen size={14} /> : <PlusCircle size={14} />}
            {profileExists ? 'Editable' : 'New Profile'}
          </span>
        </div>

        {!profileExists ? (
          <div className="patient-inline-note">
            This is your first step in CareLedger. Add your profile once, then update anytime.
          </div>
        ) : null}

        <form className="patient-form-grid-v2" onSubmit={onSubmit}>
          <label>
            Full Name
            <input value={form.full_name} onChange={(e) => onChange('full_name', e.target.value)} />
          </label>

          {!profileExists ? (
            <label>
              Health ID
              <input
                placeholder="Enter unique health id"
                value={healthIdInput}
                onChange={(e) => setHealthIdInput(e.target.value)}
              />
            </label>
          ) : (
            <label>
              Health ID
              <input value={healthId} disabled />
            </label>
          )}

          <label>
            Date of Birth
            <LuxeDateField
              value={form.date_of_birth}
              onChange={(value) => onChange('date_of_birth', value)}
              placeholder="Select date of birth"
              maxDate={new Date()}
            />
          </label>

          <label>
            Gender
            <select value={form.gender} onChange={(e) => onChange('gender', e.target.value)}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label>
            Blood Group
            <select value={form.blood_group} onChange={(e) => onChange('blood_group', e.target.value)}>
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </label>

          <div className="patient-form-actions-v2">
            <button
              className="submit-btn slim"
              disabled={saving || (profileExists ? !hasChanges : !canCreate)}
              type="submit"
            >
              {saving ? 'Saving...' : profileExists ? 'Save Changes' : 'Create Profile'}
            </button>
            {profileExists ? (
              <button
                type="button"
                className="patient-secondary-btn"
                disabled={!hasChanges || saving}
                onClick={() => {
                  setForm(initialForm);
                  setMessage('');
                  setError('');
                }}
              >
                Reset
              </button>
            ) : null}
          </div>
        </form>

        {message ? (
          <p className="ok-text patient-soft-success">
            <CheckCircle2 size={14} /> {message}
          </p>
        ) : null}
        {error ? <p className="patient-soft-error">{error}</p> : null}
      </article>
    </section>
  );
}

export default PatientProfilePage;
