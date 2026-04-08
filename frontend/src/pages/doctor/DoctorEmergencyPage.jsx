import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  LoaderCircle,
  Search,
  ShieldAlert,
  Siren,
  Stethoscope,
  X,
} from 'lucide-react';
import { getDoctorClinics } from '../../api/clinics';
import { searchPatientsForConsultation } from '../../api/doctorConsultations';
import { getEmergencyPatientData } from '../../api/doctorEmergency';
import { formatDate } from '../../utils/formatters';

function toFriendlyMessage(error, fallback) {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;
  const message = error?.response?.data?.error?.message;

  if (message && typeof message === 'string') return message;
  if (status === 400 || code === 'VALIDATION_ERROR') return 'Please verify patient and clinic details.';
  if (status === 403 || code === 'FORBIDDEN') return 'Emergency tools are available after doctor verification.';
  if (status === 404 || code === 'NOT_FOUND') return 'Emergency record not found for this patient.';
  return fallback;
}

function DoctorEmergencyPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [clinics, setClinics] = useState([]);
  const [clinicId, setClinicId] = useState('');

  const [criticalData, setCriticalData] = useState(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });

  const selectedClinic = useMemo(() => clinics.find((c) => c.id === clinicId) || null, [clinics, clinicId]);

  useEffect(() => {
    const loadClinics = async () => {
      try {
        const response = await getDoctorClinics();
        const all = response?.data || [];
        setClinics(all);
        if (all.length > 0) {
          setClinicId(all[0].id);
        }
      } catch {
        setClinics([]);
      }
    };

    loadClinics();
  }, []);

  const runSearch = async (event) => {
    event?.preventDefault();
    setSearching(true);
    setNotice({ type: '', text: '' });

    try {
      const data = await searchPatientsForConsultation(query, 12);
      setResults(data);
      if (data.length === 0) {
        setNotice({ type: 'error', text: 'No patients found for this search.' });
      }
    } catch (error) {
      setResults([]);
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Patient search failed. Please retry.') });
    } finally {
      setSearching(false);
    }
  };

  const openPatientModal = (patient) => {
    setSelectedPatient(patient);
    setCriticalData(null);
    setModalOpen(true);
  };

  const triggerEmergency = async () => {
    if (!selectedPatient?.id) {
      setNotice({ type: 'error', text: 'Select a patient to continue.' });
      return;
    }

    if (!clinicId) {
      setNotice({ type: 'error', text: 'Select a clinic before activating emergency flow.' });
      return;
    }

    try {
      setWorking(true);
      const response = await getEmergencyPatientData(selectedPatient.id, clinicId);
      const row = Array.isArray(response?.data) ? response.data[0] : null;
      setCriticalData(row || null);
      setNotice({ type: 'success', text: 'Critical data loaded and emergency contacts were notified by email.' });
    } catch (error) {
      setCriticalData(null);
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Unable to activate emergency service right now.') });
    } finally {
      setWorking(false);
    }
  };

  const allergies = Array.isArray(criticalData?.allergies) ? criticalData.allergies : [];
  const chronic = Array.isArray(criticalData?.['chronic-illness']) ? criticalData['chronic-illness'] : [];
  const meds = Array.isArray(criticalData?.['active-medications']) ? criticalData['active-medications'] : [];

  return (
    <section className="doctor-page-luxe emergency-artboard-page">
      <article className="doctor-card emergency-artboard-hero">
        <div className="panel-head split">
          <div>
            <h3>Emergency Service</h3>
            <p className="muted emergency-artboard-sub">Search patient quickly and unlock critical profile with emergency contact alerts.</p>
          </div>
          <span className="luxe-pill-tag emergency-pill"><Siren size={12} /> Critical Response</span>
        </div>

        <form className="consultation-artboard-search" onSubmit={runSearch}>
          <input
            type="text"
            placeholder="Search by patient name or health ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="submit-btn slim" disabled={searching}>
            {searching ? <LoaderCircle size={16} className="spin" /> : <Search size={16} />} Search
          </button>
        </form>
      </article>

      {results.length > 0 ? (
        <article className="doctor-card consultation-artboard-results">
          <div className="panel-head">
            <h3>Patients</h3>
            <span className="luxe-subtle-count">{results.length} matches</span>
          </div>

          <div className="consultation-artboard-grid">
            {results.map((row) => (
              <button
                type="button"
                key={row.id}
                className="consultation-art-card emergency-art-card"
                onClick={() => openPatientModal(row)}
                disabled={working}
              >
                <div className="consultation-art-card-head">
                  <div>
                    <h4>{row.full_name}</h4>
                    <p>{row.health_id || 'Health ID unavailable'}</p>
                  </div>
                  {row.active_consultation_id ? (
                    <span className="status-chip success">Active consult</span>
                  ) : row.has_active_access ? (
                    <span className="status-chip">Access active</span>
                  ) : (
                    <span className="status-chip muted">Approval pending</span>
                  )}
                </div>
                <div className="consultation-art-card-foot">
                  <small>{row.gender || 'N/A'}</small>
                  <small>{row.date_of_birth ? formatDate(row.date_of_birth) : 'DOB unavailable'}</small>
                </div>
              </button>
            ))}
          </div>
        </article>
      ) : null}

      {modalOpen && selectedPatient ? (
        <div className="consultation-modal-overlay" onClick={() => setModalOpen(false)}>
          <article className="consultation-modal-shell emergency-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="consultation-modal-head">
              <div>
                <h3>{selectedPatient.full_name}</h3>
                <p>{selectedPatient.health_id || 'Health ID unavailable'}</p>
              </div>
              <div className="consultation-modal-head-actions">
                <button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close emergency modal">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="consultation-context-row">
              <p>
                <strong>Clinic:</strong> {selectedClinic?.clinic_name || 'Not selected'}
              </p>
              <label>
                Select clinic for response
                <select value={clinicId} onChange={(event) => setClinicId(event.target.value)}>
                  <option value="">Select clinic</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.clinic_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="consultation-modal-action-row emergency-action-row">
              <button type="button" className="submit-btn slim emergency-trigger-btn" onClick={triggerEmergency} disabled={working || !clinicId}>
                {working ? <LoaderCircle size={14} className="spin" /> : <HeartPulse size={14} />} Send Alert
              </button>
            </div>

            {criticalData ? (
              <div className="emergency-critical-grid">
                <section className="snapshot-mini-card emergency-critical-card">
                  <h4><ShieldAlert size={15} /> Patient Summary</h4>
                  <p><strong>Name:</strong> {criticalData['patient-name'] || selectedPatient.full_name}</p>
                  <p><strong>Gender:</strong> {criticalData.gender || '-'}</p>
                  <p><strong>Blood Group:</strong> {criticalData.blood_group || '-'}</p>
                  <p><strong>Age:</strong> {String(criticalData.age || '-')}</p>
                </section>

                <section className="snapshot-mini-card emergency-critical-card">
                  <h4><AlertTriangle size={15} /> Allergies</h4>
                  {allergies.length === 0 ? <p>No allergy data recorded.</p> : null}
                  {allergies.slice(0, 8).map((item, index) => (
                    <p key={`${item.allergy}-${index}`}>
                      {item.allergy || 'Unknown'} <span className="status-chip muted">{item.severity || 'unspecified'}</span>
                    </p>
                  ))}
                </section>

                <section className="snapshot-mini-card emergency-critical-card">
                  <h4><Stethoscope size={15} /> Chronic Illness</h4>
                  {chronic.length === 0 ? <p>No chronic illness data recorded.</p> : null}
                  {chronic.slice(0, 8).map((item, index) => (
                    <p key={`${item['condition-name']}-${index}`}>
                      {item['condition-name'] || 'Unknown'} <span className="status-chip muted">{item.status || 'unspecified'}</span>
                    </p>
                  ))}
                </section>

                <section className="snapshot-mini-card emergency-critical-card">
                  <h4><HeartPulse size={15} /> Active Medication</h4>
                  {meds.length === 0 ? <p>No active medication data recorded.</p> : null}
                  {meds.slice(0, 8).map((item, index) => (
                    <p key={`${item['medicine-name']}-${index}`}>
                      {item['medicine-name'] || 'Unknown'} {item.dosage ? `- ${item.dosage}` : ''}
                    </p>
                  ))}
                </section>
              </div>
            ) : null}
          </article>
        </div>
      ) : null}

      {notice.text ? (
        <p className={notice.type === 'error' ? 'patient-soft-error' : 'patient-soft-success'}>
          {notice.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}

export default DoctorEmergencyPage;
