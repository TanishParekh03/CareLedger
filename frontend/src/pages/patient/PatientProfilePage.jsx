import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Mail,
  Phone,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRoundPen,
} from 'lucide-react';
import {
  createPatientProfile,
  getAllergies,
  getChronicConditions,
  getOwnPatientProfile,
  updateOwnPatientProfile,
} from '../../api/patients';
import { LuxeDateField } from '../../components/common/LuxeDatePickers';
import { useLocation } from 'react-router-dom';
import { formatDate, titleCase, toDateInputValue } from '../../utils/formatters';

const INITIAL_STATE = {
  full_name: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
};

function PatientProfilePage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INITIAL_STATE);
  const [healthIdInput, setHealthIdInput] = useState('');
  const [initialForm, setInitialForm] = useState(INITIAL_STATE);
  const [healthId, setHealthId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileExists, setProfileExists] = useState(true);
  const [message, setMessage] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  const profileQuery = useQuery({ queryKey: ['patient-profile'], queryFn: getOwnPatientProfile, retry: false });
  const conditionsQuery = useQuery({ queryKey: ['patient-conditions'], queryFn: getChronicConditions });
  const allergiesQuery = useQuery({ queryKey: ['patient-allergies'], queryFn: getAllergies });

  const isProfile404 = profileQuery.isError && profileQuery.error?.response?.data?.error?.code === 'NOT_FOUND';

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

  useEffect(() => {
    if (profileQuery.isSuccess && profileQuery.data) {
      setProfileExists(true);
      applyProfileData(profileQuery.data.data);
    } else if (isProfile404) {
      setProfileExists(false);
    } else if (profileQuery.isError && !isProfile404) {
       setErrorLocal(profileQuery.error?.userMessage || 'Unable to load profile right now.');
    }
  }, [profileQuery.data, profileQuery.isSuccess, profileQuery.isError, isProfile404]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createMutation = useMutation({
    mutationFn: (payload) => createPatientProfile(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['patient-profile'], response);
      applyProfileData({ ...response?.data, email, phone });
      setProfileExists(true);
      setMessage('Profile created successfully.');
    },
    onError: (e) => setErrorLocal(e?.userMessage || 'Could not create profile.')
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateOwnPatientProfile(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['patient-profile'], response);
      applyProfileData({ ...response?.data, email, phone });
      setMessage('Profile updated successfully.');
    },
    onError: (e) => setErrorLocal(e?.userMessage || 'Could not update profile.')
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setErrorLocal('');

    if (!profileExists) {
      createMutation.mutate({ ...form, health_id: healthIdInput });
    } else {
      updateMutation.mutate(form);
    }
  };

  const loading = profileQuery.isLoading;
  const saving = createMutation.isPending || updateMutation.isPending;
  const conditionsLoading = conditionsQuery.isLoading;
  const allergiesLoading = allergiesQuery.isLoading;
  const conditions = conditionsQuery.data?.data || [];
  const allergies = allergiesQuery.data?.data || [];
  const error = errorLocal;

  const completionFields = [form.full_name, form.date_of_birth, form.gender, form.blood_group].filter(Boolean).length;
  const completionPercent = Math.round((completionFields / 4) * 100);
  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);
  const canCreate = Boolean(form.full_name.trim() && healthIdInput.trim());

  if (loading) {
    return <p className="patient-empty">Loading profile...</p>;
  }

  const activeConditions = conditions.filter((c) => c.status === 'active');

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

      {/* ── Active Conditions Section ────────────────────────────────────────── */}
      <article className="patient-profile-readonly-card">
        <div className="panel-head">
          <h3>Active Conditions</h3>
          <span className="luxe-pill-tag">Long-term History</span>
        </div>

        <p className="patient-inline-note">
          Your chronic conditions as managed by your doctors. View-only.
        </p>

        {conditionsLoading ? <p className="muted">Loading conditions...</p> : null}

        {!conditionsLoading && activeConditions.length === 0 ? (
          <div className="luxe-empty-mini">
            <ClipboardList size={18} />
            <p>No active conditions on record.</p>
          </div>
        ) : null}

        {activeConditions.length > 0 ? (
          <div className="profile-readonly-list">
            {activeConditions.map((item) => (
              <div key={item.id} className="profile-readonly-item">
                <div className="profile-readonly-item-head">
                  <ShieldCheck size={15} />
                  <strong>{item.condition_name}</strong>
                </div>
                <div className="profile-readonly-item-meta">
                  <span
                    className={`status-pill ${
                      item.status === 'active' ? 'success' : item.status === 'managed' ? 'warn' : 'neutral'
                    }`}
                  >
                    {titleCase(item.status)}
                  </span>
                  <span className="condition-date-chip">
                    <CalendarDays size={12} /> {item.diagnosed_date ? formatDate(item.diagnosed_date) : 'Date not set'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      {/* ── Allergies Section ────────────────────────────────────────────────── */}
      <article className="patient-profile-readonly-card">
        <div className="panel-head">
          <h3>Allergies</h3>
          <span className="luxe-pill-tag">Risk Profile</span>
        </div>

        <p className="patient-inline-note">
          Your recorded allergens and their severity. Manage allergies from the Allergies page.
        </p>

        {allergiesLoading ? <p className="muted">Loading allergies...</p> : null}

        {!allergiesLoading && allergies.length === 0 ? (
          <div className="luxe-empty-mini">
            <FlaskConical size={18} />
            <p>No allergies recorded yet.</p>
          </div>
        ) : null}

        {allergies.length > 0 ? (
          <div className="profile-readonly-list">
            {allergies.map((item) => (
              <div key={item.id} className="profile-readonly-item">
                <div className="profile-readonly-item-head">
                  <ShieldAlert size={15} />
                  <strong>{item.allergen}</strong>
                </div>
                <div className="profile-readonly-item-meta">
                  <span
                    className={`status-pill ${
                      item.severity === 'severe' ? 'danger' : item.severity === 'moderate' ? 'warn' : 'neutral'
                    }`}
                  >
                    {titleCase(item.severity)} Risk
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {allergies.filter((a) => a.severity === 'severe').length > 0 ? (
          <div className="profile-severe-alert">
            <AlertTriangle size={14} />
            <span>{allergies.filter((a) => a.severity === 'severe').length} severe allergy alert(s)</span>
          </div>
        ) : null}
      </article>
    </section>
  );
}

export default PatientProfilePage;

