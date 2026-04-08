import { useEffect, useState } from 'react';
import { getPatientAccessList, grantDoctorAccess, revokeDoctorAccess } from '../../api/patients';
import { searchDoctorDirectory } from '../../api/doctors';
import { LuxeDateTimeField } from '../../components/common/LuxeDatePickers';
import { formatDate, titleCase } from '../../utils/formatters';

function PatientAccessPage() {
  const [list, setList] = useState([]);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchingDoctors, setSearchingDoctors] = useState(false);

  const loadList = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getPatientAccessList();
      setList(response?.data || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to load access list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

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
    setError('');
  };

  const handleGrant = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    let doctorToGrant = selectedDoctor;

    // If user typed a valid doctor name but didn't click the dropdown, resolve it automatically.
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
        setError('Unable to validate doctor name right now. Please try again.');
        return;
      }
    }

    if (!doctorToGrant?.id) {
      setError('Please select a doctor from the suggestions to grant access.');
      return;
    }

    try {
      await grantDoctorAccess({ doctor_id: doctorToGrant.id, expires_at: expiresAt || null });
      setDoctorQuery('');
      setSelectedDoctor(null);
      setDoctorOptions([]);
      setExpiresAt('');
      setMessage('Access granted successfully.');
      loadList();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to grant access.');
    }
  };

  const handleRevoke = async (targetDoctorId) => {
    if (!window.confirm('Revoke access for this doctor?')) return;

    setMessage('');
    setError('');
    try {
      await revokeDoctorAccess(targetDoctorId);
      setMessage('Access revoked successfully.');
      loadList();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to revoke access.');
    }
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
          <button className="submit-btn slim" type="submit">
            Grant Access
          </button>
        </form>
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.doctor_name || row.doctor_id}</td>
                <td>{formatDate(row.created_at)}</td>
                <td>{formatDate(row.expires_at)}</td>
                <td>
                  <span className={`status-pill ${String(row.status || '').toLowerCase() === 'active' ? 'success' : 'neutral'}`}>
                    {titleCase(row.status)}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="text-btn danger"
                    onClick={() => handleRevoke(row.doctor_id)}
                  >
                    Revoke
                  </button>
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
    </section>
  );
}

export default PatientAccessPage;
