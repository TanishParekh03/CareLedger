import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatientAccessList, grantDoctorAccess, revokeDoctorAccess } from '../../api/patients';
import { searchDoctorDirectory } from '../../api/doctors';
import { LuxeDateTimeField } from '../../components/common/LuxeDatePickers';
import { formatDate, titleCase } from '../../utils/formatters';

function PatientAccessPage() {
  const queryClient = useQueryClient();
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [errorLocal, setErrorLocal] = useState('');
  const [message, setMessage] = useState('');
  const [searchingDoctors, setSearchingDoctors] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [doctorToRevoke, setDoctorToRevoke] = useState(null);

  const { data: listRes, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['patient-access-list'],
    queryFn: getPatientAccessList
  });
  const list = listRes?.data || [];
  const error = errorLocal || (fetchError ? fetchError?.response?.data?.error?.message || 'Failed to load access list.' : '');

  useEffect(() => {
    const query = doctorQuery.trim();

    if (selectedDoctor && query === selectedDoctor.full_name) {
      return;
    }

    if (!query || query.length < 2) {
      setDoctorOptions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchingDoctors(true);
      try {
        const doctors = await searchDoctorDirectory(query);
        setDoctorOptions(doctors);
      } catch {
        setDoctorOptions([]);
      } finally {
        setSearchingDoctors(false);
      }
    }, 220);

    return () => clearTimeout(timeoutId);
  }, [doctorQuery, selectedDoctor]);

  const chooseDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setDoctorQuery(doctor.full_name);
    setDoctorOptions([]);
    setErrorLocal('');
  };

  const grantMutation = useMutation({
    mutationFn: grantDoctorAccess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-access-list'] });
      setDoctorQuery('');
      setSelectedDoctor(null);
      setDoctorOptions([]);
      setExpiresAt('');
      setMessage('Access granted successfully.');
    },
    onError: (e) => setErrorLocal(e?.response?.data?.error?.message || 'Failed to grant access.')
  });

  const revokeMutation = useMutation({
    mutationFn: revokeDoctorAccess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-access-list'] });
      setMessage(`Access for ${doctorToRevoke?.doctor_name || 'the doctor'} has been revoked.`);
      setShowRevokeConfirm(false);
      setDoctorToRevoke(null);
    },
    onError: (e) => {
      setErrorLocal(e?.response?.data?.error?.message || 'Failed to revoke access.');
      setShowRevokeConfirm(false);
    }
  });

  const isSubmitting = grantMutation.isPending || revokeMutation.isPending;

  const handleGrant = async (event) => {
    event.preventDefault();
    setMessage('');
    setErrorLocal('');

    let doctorToGrant = selectedDoctor;

    if (!doctorToGrant?.id && doctorQuery.trim().length >= 2) {
      try {
        const matches = await searchDoctorDirectory(doctorQuery, 20);
        const exact = matches.find(
          (doc) => doc.full_name?.trim().toLowerCase() === doctorQuery.trim().toLowerCase()
        );

        if (exact) {
          doctorToGrant = exact;
          setSelectedDoctor(exact);
          setDoctorOptions([]);
        }
      } catch {
        setErrorLocal('Unable to validate doctor name right now. Please try again.');
        return;
      }
    }

    if (!doctorToGrant?.id) {
      setErrorLocal('Please select a doctor from the suggestions to grant access.');
      return;
    }

    grantMutation.mutate({ doctor_id: doctorToGrant.id, expires_at: expiresAt || null });
  };

  const handleRevoke = (doctor) => {
    setDoctorToRevoke(doctor);
    setShowRevokeConfirm(true);
  };

  const confirmRevoke = () => {
    if (!doctorToRevoke) return;
    setMessage('');
    setErrorLocal('');
    revokeMutation.mutate(doctorToRevoke.doctor_id);
  };

  return (
    <section className="patient-page-luxe">
      <div className="panel luxe-section-card">
        <div className="panel-head">
          <h3>Grant Doctor Access</h3>
          <span className="luxe-pill-tag">Secure Sharing</span>
        </div>

        <form className="inline-form" onSubmit={handleGrant}>
          <div className="doctor-picker">
            <input
              placeholder="Search doctor by name or specialty"
              value={doctorQuery}
              onChange={(e) => {
                const value = e.target.value;
                setDoctorQuery(value);
                if (selectedDoctor && value !== selectedDoctor.full_name) {
                  setSelectedDoctor(null);
                }
              }}
              required
            />

            {doctorOptions.length > 0 ? (
              <div className="doctor-picker-dropdown">
                {doctorOptions.map((doctor) => (
                  <button
                    key={doctor.id}
                    type="button"
                    className="doctor-option"
                    onClick={() => chooseDoctor(doctor)}
                  >
                    <span>{doctor.full_name}</span>
                    <small>{doctor.specialization || 'General Practice'}</small>
                  </button>
                ))}
              </div>
            ) : null}

            {searchingDoctors ? <p className="doctor-search-hint">Searching directory...</p> : null}
            {!searchingDoctors && doctorQuery.trim().length >= 2 && doctorOptions.length === 0 && !selectedDoctor ? (
              <p className="doctor-search-hint">No verified doctor found. Try a different name.</p>
            ) : null}
            {selectedDoctor ? (
              <div className="doctor-selected-chip">
                <strong>{selectedDoctor.full_name}</strong>
                <span>{selectedDoctor.specialization || 'General Practice'}</span>
              </div>
            ) : null}
          </div>
          <LuxeDateTimeField value={expiresAt} onChange={setExpiresAt} placeholder="Access expiry (optional)" />
          <button className="submit-btn slim" type="submit" disabled={isSubmitting} style={{ minWidth: '135px' }}>
            {isSubmitting ? 'Granting...' : 'Grant Access'}
          </button>
        </form>
        {error ? <p className="alert-error" style={{ marginTop: '12px' }}>{error}</p> : null}
        {message ? <p className="alert-success" style={{ marginTop: '12px' }}>{message}</p> : null}
      </div>

      <div className="panel luxe-section-card">
        <div className="panel-head">
          <h3>Access List</h3>
          <span className="luxe-subtle-count">{list.length} records</span>
        </div>

        {loading ? <p className="muted">Loading access list...</p> : null}

        <table className="table">
          <thead>
            <tr>
              <th>Doctor Name</th>
              <th>Granted At</th>
              <th>Expires At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id} onClick={() => handleRevoke(row)}>
                <td>{row.doctor_name || row.doctor_id}</td>
                <td>{formatDate(row.created_at)}</td>
                <td>{formatDate(row.expires_at)}</td>
                <td>
                  <span className={`status-pill ${String(row.status || '').toLowerCase() === 'active' ? 'success' : 'neutral'}`}>
                    {titleCase(row.status)}
                  </span>
                </td>
              </tr>
            ))}
            {list.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="patient-empty">
                  No doctor access records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showRevokeConfirm && (
        <div className="luxe-modal-overlay">
          <div className="luxe-modal-shell">
            <div className="luxe-modal-head">
              <h3>Revoke Access?</h3>
              <p>
                Are you sure you want to revoke access for <strong>{doctorToRevoke?.doctor_name}</strong>? 
                This doctor will no longer be able to view your medical records.
              </p>
            </div>
            <div className="luxe-modal-actions">
              <button 
                type="button" 
                className="patient-secondary-btn" 
                onClick={() => setShowRevokeConfirm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="submit-btn danger slim" 
                onClick={confirmRevoke}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Revoking...' : 'Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PatientAccessPage;
