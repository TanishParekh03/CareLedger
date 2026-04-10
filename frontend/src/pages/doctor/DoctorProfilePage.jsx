import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ShieldCheck, Sparkles, UserRoundPen, Building2, MapPin, Mail, Phone } from 'lucide-react';
import { createDoctorProfile, getDoctorProfile, updateDoctorProfile } from '../../api/doctors';
import { getDoctorClinics } from '../../api/clinics';

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
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INITIAL_FORM);
  const [initialForm, setInitialForm] = useState(INITIAL_FORM);
  const [profileExists, setProfileExists] = useState(true);
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState('-');
  const [phone, setPhone] = useState('-');
  const [notice, setNotice] = useState({ type: '', text: '' });
  
  const profileQuery = useQuery({ queryKey: ['doctor-profile'], queryFn: getDoctorProfile, retry: false });
  const clinicsQuery = useQuery({ queryKey: ['clinics'], queryFn: getDoctorClinics, enabled: profileExists });

  const isProfile404 = profileQuery.isError && profileQuery.error?.response?.data?.error?.code === 'NOT_FOUND';

  useEffect(() => {
    if (profileQuery.isSuccess && profileQuery.data) {
      const data = profileQuery.data.data;
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
    } else if (isProfile404) {
      setProfileExists(false);
      setForm(INITIAL_FORM);
      setInitialForm(INITIAL_FORM);
    } else if (profileQuery.isError && !isProfile404) {
      setNotice({ type: 'error', text: 'Unable to load doctor profile right now.' });
    }
  }, [profileQuery.data, profileQuery.isSuccess, profileQuery.isError, isProfile404]);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);
  const canCreate = Boolean(form.full_name.trim() && form.license_number.trim());

  const applyMutationSuccess = (data, isCreate) => {
    queryClient.setQueryData(['doctor-profile'], { data });
    const nextForm = {
      full_name: data.full_name || form.full_name,
      license_number: data.license_number || form.license_number,
      specialization: data.specialization || '',
    };
    setForm(nextForm);
    setInitialForm(nextForm);
    setVerified(Boolean(data.is_verified));
    setNotice({ type: 'success', text: isCreate ? 'Doctor profile created.' : 'Doctor profile updated.' });
  };

  const createMutation = useMutation({
    mutationFn: createDoctorProfile,
    onSuccess: (res) => {
      setProfileExists(true);
      applyMutationSuccess(res.data, true);
    },
    onError: (e) => setNotice({ type: 'error', text: toFriendlyMessage(e, 'Unable to save doctor profile right now.') })
  });

  const updateMutation = useMutation({
    mutationFn: updateDoctorProfile,
    onSuccess: (res) => applyMutationSuccess(res.data, false),
    onError: (e) => setNotice({ type: 'error', text: toFriendlyMessage(e, 'Unable to save doctor profile right now.') })
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    setNotice({ type: '', text: '' });
    if (profileExists) {
      updateMutation.mutate({ full_name: form.full_name, specialization: form.specialization });
    } else {
      createMutation.mutate(form);
    }
  };

  const loading = profileQuery.isLoading;
  const saving = createMutation.isPending || updateMutation.isPending;
  const clinics = clinicsQuery.data?.data || [];

  if (loading) {
    return <p className="patient-empty">Loading profile...</p>;
  }

  return (
    <>
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

      {profileExists && (
        <section className="patient-profile-readonly-card" style={{ marginTop: '20px' }}>
          <div className="panel-head">
            <h3>Active Clinics</h3>
            <span className="luxe-subtle-count">{clinics.length} locations</span>
          </div>

          {clinics.length === 0 ? (
            <p className="patient-empty">No clinics added to your profile.</p>
          ) : (
            <div className="clinic-records-grid" style={{ marginTop: '16px' }}>
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
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

export default DoctorProfilePage;
