import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  ShieldAlert,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { getDoctorClinics } from '../../api/clinics';
import { getDoctorConsultations } from '../../api/doctors';
import {
  getConsultationPrescription,
  getPatientSnapshotAllergies,
  getPatientSnapshotConditions,
  getPatientSnapshotEmergency,
  getPatientSnapshotProfile,
  searchPatientsForConsultation,
  startConsultation,
  updateConsultationStatus,
  upsertConsultationPrescription,
} from '../../api/doctorConsultations';
import { formatDate, titleCase } from '../../utils/formatters';

const EMPTY_ITEM = {
  drug_name: '',
  dosage: '',
  frequency: '',
  duration_days: '',
};

function toFriendlyMessage(error, fallback) {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;
  const message = error?.response?.data?.error?.message;

  if (message && typeof message === 'string') return message;
  if (status === 400 || code === 'VALIDATION_ERROR') return 'Please review the form fields and try again.';
  if (status === 403 || code === 'FORBIDDEN') return 'You need active patient access to continue this consultation.';
  if (status === 404 || code === 'NOT_FOUND') return 'No matching data was found for this action.';
  if (status === 409 || code === 'CONFLICT') return 'This consultation record conflicts with existing data.';
  return fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function DoctorConsultationsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [pdfPreviewHtml, setPdfPreviewHtml] = useState('');
  const [consultationId, setConsultationId] = useState('');

  const [snapshot, setSnapshot] = useState({
    profile: null,
    allergies: [],
    conditions: [],
    emergency: [],
  });
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  const [clinics, setClinics] = useState([]);
  const [clinicId, setClinicId] = useState('');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [consultationLog, setConsultationLog] = useState([]);
  const [loadingConsultationLog, setLoadingConsultationLog] = useState(false);

  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });

  const selectedClinic = useMemo(() => clinics.find((c) => c.id === clinicId) || null, [clinics, clinicId]);

  const loadClinics = async () => {
    try {
      const response = await getDoctorClinics();
      const all = response?.data || [];
      setClinics(all);
      if (!clinicId && all.length > 0) {
        setClinicId(all[0].id);
      }
    } catch {
      setClinics([]);
    }
  };

  const loadConsultationLog = async () => {
    setLoadingConsultationLog(true);
    try {
      const response = await getDoctorConsultations();
      setConsultationLog(response?.data || []);
    } catch {
      setConsultationLog([]);
    } finally {
      setLoadingConsultationLog(false);
    }
  };

  useEffect(() => {
    loadClinics();
    loadConsultationLog();
  }, []);

  const loadSnapshot = async (patientId) => {
    setLoadingSnapshot(true);
    try {
      const [profileRes, allergyRes, conditionRes, emergencyRes] = await Promise.allSettled([
        getPatientSnapshotProfile(patientId),
        getPatientSnapshotAllergies(patientId),
        getPatientSnapshotConditions(patientId),
        getPatientSnapshotEmergency(patientId),
      ]);

      setSnapshot({
        profile: profileRes.status === 'fulfilled' ? profileRes.value?.data || null : null,
        allergies: allergyRes.status === 'fulfilled' ? allergyRes.value?.data || [] : [],
        conditions: conditionRes.status === 'fulfilled' ? conditionRes.value?.data || [] : [],
        emergency: emergencyRes.status === 'fulfilled' ? emergencyRes.value?.data?.emergency_details || [] : [],
      });
    } finally {
      setLoadingSnapshot(false);
    }
  };

  const loadPrescription = async (nextConsultationId) => {
    try {
      const response = await getConsultationPrescription(nextConsultationId);
      const rows = Array.isArray(response?.data?.items)
        ? response.data.items.filter((item) => item?.drug_name || item?.dosage || item?.frequency || item?.duration_days)
        : [];

      setItems(rows.length > 0 ? rows.map((item) => ({ ...EMPTY_ITEM, ...item })) : [{ ...EMPTY_ITEM }]);
    } catch {
      setItems([{ ...EMPTY_ITEM }]);
    }
  };

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

  const openPatientWorkspace = async (row) => {
    setWorkspaceOpen(true);
    setSelectedPatient(row);
    setPdfPreviewHtml('');
    setNotice({ type: '', text: '' });
    setSnapshot({ profile: null, allergies: [], conditions: [], emergency: [] });
    setItems([{ ...EMPTY_ITEM }]);

    if (row.active_consultation_id) {
      setConsultationId(row.active_consultation_id);
      await Promise.all([loadSnapshot(row.id), loadPrescription(row.active_consultation_id)]);
      return;
    }

    setConsultationId('');
    if (row.has_active_access) {
      await loadSnapshot(row.id);
    }
  };

  const startFromModal = async () => {
    if (!selectedPatient) return;

    try {
      setWorking(true);
      const response = await startConsultation(selectedPatient.id);
      const nextConsultationId = response?.data?.id;
      if (!nextConsultationId) {
        throw new Error('Missing consultation id');
      }

      setConsultationId(nextConsultationId);
      await Promise.all([loadSnapshot(selectedPatient.id), loadPrescription(nextConsultationId)]);
      await loadConsultationLog();
      setNotice({ type: 'success', text: 'Consultation started. Prescription workspace is ready.' });

      setResults((prev) =>
        prev.map((item) =>
          item.id === selectedPatient.id
            ? {
                ...item,
                has_active_access: true,
                active_consultation_id: nextConsultationId,
              }
            : item,
        ),
      );
    } catch (error) {
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Unable to start consultation right now.') });
    } finally {
      setWorking(false);
    }
  };

  const updateItem = (index, key, value) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)));
  };

  const addRow = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const deleteRow = (index) => {
    setItems((prev) => {
      if (prev.length === 1) {
        return [{ ...EMPTY_ITEM }];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const buildPayload = () => {
    const cleaned = items
      .map((item) => ({
        drug_name: String(item.drug_name || '').trim(),
        dosage: String(item.dosage || '').trim(),
        frequency: String(item.frequency || '').trim(),
        duration_days: Number(item.duration_days),
      }))
      .filter((item) => item.drug_name || item.dosage || item.frequency || Number.isFinite(item.duration_days));

    const invalid = cleaned.some(
      (item) =>
        !item.drug_name ||
        !item.dosage ||
        !item.frequency ||
        !Number.isFinite(item.duration_days) ||
        item.duration_days < 1,
    );

    if (invalid || cleaned.length === 0) {
      return {
        ok: false,
        items: [],
      };
    }

    return {
      ok: true,
      items: cleaned,
    };
  };

  const savePrescription = async () => {
    if (!consultationId) {
      setNotice({ type: 'error', text: 'Start or open a consultation before saving prescription.' });
      return;
    }

    const payload = buildPayload();
    if (!payload.ok) {
      setNotice({ type: 'error', text: 'Complete every medicine row before saving prescription.' });
      return;
    }

    try {
      setWorking(true);
      await upsertConsultationPrescription(consultationId, payload.items);
      setNotice({ type: 'success', text: 'Prescription saved successfully.' });
    } catch (error) {
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Failed to save prescription right now.') });
    } finally {
      setWorking(false);
    }
  };

  const generatePdf = async () => {
    if (!consultationId) {
      setNotice({ type: 'error', text: 'Start or open a consultation before creating PDF.' });
      return;
    }

    if (!selectedClinic) {
      setNotice({ type: 'error', text: 'Select a clinic before creating PDF.' });
      return;
    }

    const payload = buildPayload();
    if (!payload.ok) {
      setNotice({ type: 'error', text: 'Complete medicine rows before creating PDF.' });
      return;
    }

    const patientName = snapshot.profile?.full_name || selectedPatient?.full_name || 'Patient';
    const patientHealthId = snapshot.profile?.health_id || selectedPatient?.health_id || 'N/A';
    const when = formatDate(new Date().toISOString());
    const clinicName = selectedClinic?.clinic_name || 'Clinic';
    const clinicAddress = selectedClinic?.address || 'Address not available';
    const clinicPhone = selectedClinic?.phone || 'Not available';
    const clinicEmail = selectedClinic?.email || 'Not available';

    const logoHtml = selectedClinic?.logo_url
      ? `<img src="${escapeHtml(selectedClinic.logo_url)}" alt="Clinic logo" class="rx-logo-img" />`
      : `<div class="rx-logo-fallback">${escapeHtml(clinicName.slice(0, 2).toUpperCase())}</div>`;

    const itemRows = payload.items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.drug_name)}</td>
            <td>${escapeHtml(item.dosage)}</td>
            <td>${escapeHtml(item.frequency)}</td>
            <td>${item.duration_days}</td>
          </tr>
        `,
      )
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>E-Prescription</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: Arial, sans-serif; color: #15232a; margin: 0; }
            .rx-paper { border: 1px solid #d4dde4; border-radius: 10px; overflow: hidden; }
            .rx-header { display: grid; grid-template-columns: 80px 1fr; gap: 14px; align-items: center; padding: 16px; background: linear-gradient(180deg, #f4f9f8, #ffffff); border-bottom: 1px solid #d9e4e8; }
            .rx-logo-img { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; border: 1px solid #d0dce0; }
            .rx-logo-fallback { width: 64px; height: 64px; border-radius: 10px; display: grid; place-items: center; font-weight: 700; color: #1a4a4a; background: #e7f1ef; border: 1px solid #c9ddda; }
            .rx-clinic h1 { margin: 0; font-size: 20px; }
            .rx-clinic p { margin: 3px 0 0; font-size: 12px; color: #35505f; }
            .rx-body { padding: 14px 16px 10px; }
            .rx-title { margin: 0 0 10px; font-size: 18px; letter-spacing: 0.02em; }
            .rx-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin-bottom: 14px; font-size: 12px; }
            .rx-meta p { margin: 0; }
            .rx-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            .rx-table th, .rx-table td { border: 1px solid #d2dde4; padding: 8px; text-align: left; font-size: 12px; }
            .rx-table th { background: #edf4f7; }
            .rx-notes { margin-top: 14px; font-size: 12px; color: #2f4652; }
            .rx-footer { margin-top: 18px; border-top: 1px dashed #b8c8d2; padding: 12px 16px 16px; display: grid; grid-template-columns: 1fr 220px; gap: 12px; align-items: end; }
            .rx-footer p { margin: 0; font-size: 12px; color: #395260; }
            .rx-sign { text-align: center; }
            .rx-sign-line { margin-top: 22px; border-top: 1px solid #738896; padding-top: 4px; font-size: 11px; color: #3f5562; }
          </style>
        </head>
        <body>
          <article class="rx-paper">
            <header class="rx-header">
              ${logoHtml}
              <div class="rx-clinic">
                <h1>${escapeHtml(clinicName)}</h1>
                <p>${escapeHtml(clinicAddress)}</p>
                <p>Phone: ${escapeHtml(clinicPhone)} | Email: ${escapeHtml(clinicEmail)}</p>
              </div>
            </header>

            <section class="rx-body">
              <h2 class="rx-title">E-Prescription</h2>
              <div class="rx-meta">
                <p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>
                <p><strong>Health ID:</strong> ${escapeHtml(patientHealthId)}</p>
                <p><strong>Consultation ID:</strong> ${escapeHtml(consultationId)}</p>
                <p><strong>Date:</strong> ${escapeHtml(when)}</p>
              </div>

              <table class="rx-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration (days)</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>

              <p class="rx-notes"><strong>Notes:</strong> Follow dosage schedule exactly as prescribed. In case of adverse reaction, seek medical care immediately.</p>
            </section>

            <footer class="rx-footer">
              <p>Generated digitally by CareLedger Clinical Workspace.</p>
              <div class="rx-sign">
                <div class="rx-sign-line">Authorized Signature</div>
              </div>
            </footer>
          </article>
        </body>
      </html>
    `;

    setPdfPreviewHtml(html);
    setNotice({ type: 'success', text: 'PDF preview generated on the right panel.' });
  };

  const printPrescription = () => {
    if (!pdfPreviewHtml) {
      setNotice({ type: 'error', text: 'Generate PDF preview first.' });
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
    if (!printWindow) {
      setNotice({ type: 'error', text: 'Popup blocked. Please allow popups to generate PDF.' });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(pdfPreviewHtml);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };

    setNotice({ type: 'success', text: 'Prescription print view generated successfully.' });
  };

  const completeConsultation = async () => {
    if (!consultationId) {
      setNotice({ type: 'error', text: 'No consultation is active to complete.' });
      return;
    }

    try {
      setWorking(true);
      await updateConsultationStatus(consultationId, 'completed');
      await loadConsultationLog();
      setNotice({ type: 'success', text: 'Consultation marked as completed.' });

      const patientId = selectedPatient?.id;
      if (patientId) {
        setResults((prev) =>
          prev.map((item) =>
            item.id === patientId
              ? {
                  ...item,
                  active_consultation_id: null,
                }
              : item,
          ),
        );
      }

      setConsultationId('');
      setWorkspaceOpen(false);
      setPrescriptionOpen(false);
      setPdfPreviewHtml('');
      setSelectedPatient(null);
      setSnapshot({ profile: null, allergies: [], conditions: [], emergency: [] });
      setItems([{ ...EMPTY_ITEM }]);
    } catch (error) {
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Unable to complete consultation right now.') });
    } finally {
      setWorking(false);
    }
  };

  const closeWorkspace = () => {
    setWorkspaceOpen(false);
    setPrescriptionOpen(false);
    setPdfPreviewHtml('');
  };

  const openPrescriptionModal = () => {
    if (!consultationId) {
      setNotice({ type: 'error', text: 'Start or open a consultation before creating prescription.' });
      return;
    }
    setPrescriptionOpen(true);
  };

  const canStart = Boolean(selectedPatient && selectedPatient.has_active_access && !consultationId);
  const canPrescribe = Boolean(consultationId);

  return (
    <section className="doctor-page-luxe consultation-artboard-page">
      <article className="doctor-card consultation-artboard-hero">
        <div className="panel-head split">
          <div>
            <h3>Consultation Studio</h3>
            <p className="muted consultation-artboard-sub">Search patient, open card, and treat in a focused popup workspace.</p>
          </div>
          <span className="luxe-pill-tag">Patient Lookup + Rx</span>
        </div>

        <form className="consultation-artboard-search" onSubmit={runSearch}>
          <input
            type="text"
            placeholder="Search by full name or health ID"
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
                className="consultation-art-card"
                onClick={() => openPatientWorkspace(row)}
                disabled={working}
              >
                <div className="consultation-art-card-head">
                  <div>
                    <h4>{row.full_name}</h4>
                    <p>{row.health_id || 'Health ID unavailable'}</p>
                  </div>
                  {row.active_consultation_id ? (
                    <span className="status-chip success">Active</span>
                  ) : row.has_active_access ? (
                    <span className="status-chip">Ready</span>
                  ) : (
                    <span className="status-chip muted">Pending</span>
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

      <article className="doctor-card consultation-log-card">
        <div className="panel-head">
          <h3>Consultation List</h3>
          <span className="luxe-subtle-count">{consultationLog.length} records</span>
        </div>

        {loadingConsultationLog ? <p className="muted">Loading consultations...</p> : null}

        {!loadingConsultationLog && consultationLog.length === 0 ? (
          <div className="luxe-empty-mini">
            <Stethoscope size={18} />
            <p>No consultations yet.</p>
          </div>
        ) : null}

        {consultationLog.length > 0 ? (
          <div className="consultation-log-grid">
            {consultationLog.slice(0, 12).map((item) => (
              <article key={item.id} className="consultation-log-card-item">
                <div className="consultation-log-head">
                  <div className="consultation-log-avatar" aria-hidden="true">
                    {(item.patient_name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4>{item.patient_name || 'Patient'}</h4>
                    <p>{item.health_id || 'Health ID unavailable'}</p>
                  </div>
                </div>
                <div className="consultation-log-meta">
                  <span
                    className={
                      String(item.status).toLowerCase() === 'completed'
                        ? 'status-chip success'
                        : String(item.status).toLowerCase() === 'in_progress'
                          ? 'status-chip'
                          : 'status-chip muted'
                    }
                  >
                    {titleCase(item.status)}
                  </span>
                  <small>{formatDate(item.consultation_date)}</small>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </article>

      {workspaceOpen && selectedPatient ? (
        <div className="consultation-modal-overlay" onClick={closeWorkspace}>
          <article className="consultation-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="consultation-modal-head">
              <div>
                <h3>{snapshot.profile?.full_name || selectedPatient.full_name}</h3>
                <p>{snapshot.profile?.health_id || selectedPatient.health_id || 'Health ID unavailable'}</p>
              </div>
              <div className="consultation-modal-head-actions">
                {consultationId ? (
                  <span className="status-chip success">Active consultation</span>
                ) : selectedPatient.has_active_access ? (
                  <span className="status-chip">Access active</span>
                ) : (
                  <span className="status-chip muted">Approval pending</span>
                )}
                <button type="button" className="icon-button" onClick={closeWorkspace} aria-label="Close patient workspace">
                  <X size={16} />
                </button>
              </div>
            </div>

            {loadingSnapshot ? <p className="muted">Loading patient details...</p> : null}

            {!selectedPatient.has_active_access && !selectedPatient.active_consultation_id ? (
              <p className="patient-soft-error">
                <AlertTriangle size={14} /> Patient approval is pending. Consultation can start after access is active.
              </p>
            ) : null}

            {canStart ? (
              <div className="consultation-modal-start-row">
                <button type="button" className="submit-btn slim" onClick={startFromModal} disabled={working}>
                  Start Consultation
                </button>
              </div>
            ) : null}

            {snapshot.profile ? (
              <div className="consultation-modal-grid">
                <section className="snapshot-mini-card">
                  <h4><UserRound size={15} /> Identity</h4>
                  <p><strong>Name:</strong> {snapshot.profile.full_name || '-'}</p>
                  <p><strong>Health ID:</strong> {snapshot.profile.health_id || '-'}</p>
                  <p><strong>Gender:</strong> {snapshot.profile.gender || '-'}</p>
                  <p><strong>Blood Group:</strong> {snapshot.profile.blood_group || '-'}</p>
                </section>

                <section className="snapshot-mini-card">
                  <h4><ShieldAlert size={15} /> Allergies</h4>
                  {snapshot.allergies.length === 0 ? <p>No allergies recorded.</p> : null}
                  {snapshot.allergies.slice(0, 6).map((allergy) => (
                    <p key={allergy.id || `${allergy.allergen}-${allergy.severity}`}>
                      {allergy.allergen} <span className="status-chip muted">{allergy.severity}</span>
                    </p>
                  ))}
                </section>

                <section className="snapshot-mini-card">
                  <h4><Stethoscope size={15} /> Chronic Conditions</h4>
                  {snapshot.conditions.length === 0 ? <p>No chronic conditions recorded.</p> : null}
                  {snapshot.conditions.slice(0, 6).map((condition) => (
                    <p key={condition.id || `${condition.condition_name}-${condition.status}`}>
                      {condition.condition_name} <span className="status-chip muted">{condition.status}</span>
                    </p>
                  ))}
                </section>

                <section className="snapshot-mini-card">
                  <h4><ShieldAlert size={15} /> Emergency Contacts</h4>
                  {snapshot.emergency.length === 0 ? <p>No emergency contacts recorded.</p> : null}
                  {snapshot.emergency.slice(0, 4).map((person) => (
                    <p key={person.id || `${person.emergency_email}-${person.emergency_phone_number}`}>
                      {person.emergency_name || 'Contact'}
                    </p>
                  ))}
                </section>
              </div>
            ) : null}

            {canPrescribe ? (
              <div className="consultation-modal-action-row">
                <button type="button" className="submit-btn slim" onClick={openPrescriptionModal}>
                  <FileText size={14} /> Create Prescription
                </button>
              </div>
            ) : null}
          </article>
        </div>
      ) : null}

      {prescriptionOpen && selectedPatient ? (
        <div className="consultation-prescription-overlay" onClick={() => setPrescriptionOpen(false)}>
          <article className="consultation-prescription-shell" onClick={(event) => event.stopPropagation()}>
            <div className="consultation-prescription-head">
              <div>
                <h3>Prescription Workspace</h3>
                <p>{snapshot.profile?.full_name || selectedPatient.full_name}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setPrescriptionOpen(false)} aria-label="Close prescription workspace">
                <X size={16} />
              </button>
            </div>

            <div className="consultation-prescription-layout">
              <section className="consultation-prescription-left">
                <div className="consultation-context-row">
                  <p>
                    <strong>Consultation:</strong> {consultationId ? consultationId.slice(0, 12) : 'Not started'}
                  </p>
                  <label>
                    Clinic
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

                <div className="prescription-rows-wrap">
                  {items.map((item, index) => (
                    <div key={`item-${index}`} className="prescription-row">
                      <label>
                        Medicine
                        <input
                          value={item.drug_name}
                          onChange={(event) => updateItem(index, 'drug_name', event.target.value)}
                          placeholder="e.g. Paracetamol"
                        />
                      </label>

                      <label>
                        Dosage
                        <input
                          value={item.dosage}
                          onChange={(event) => updateItem(index, 'dosage', event.target.value)}
                          placeholder="e.g. 500 mg"
                        />
                      </label>

                      <label>
                        Frequency
                        <input
                          value={item.frequency}
                          onChange={(event) => updateItem(index, 'frequency', event.target.value)}
                          placeholder="e.g. 1-0-1"
                        />
                      </label>

                      <label>
                        Duration (days)
                        <input
                          type="number"
                          min="1"
                          value={item.duration_days}
                          onChange={(event) => updateItem(index, 'duration_days', event.target.value)}
                          placeholder="5"
                        />
                      </label>

                      <button
                        type="button"
                        className="clinic-action-btn danger"
                        onClick={() => deleteRow(index)}
                        aria-label={`Delete medicine row ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="consultation-actions-row">
                  <button type="button" className="patient-secondary-btn" onClick={addRow}>
                    <Plus size={14} /> Add Medicine
                  </button>
                  <button type="button" className="submit-btn slim" onClick={savePrescription} disabled={working}>
                    Save Prescription
                  </button>
                  <button type="button" className="submit-btn slim" onClick={generatePdf} disabled={working}>
                    <FileText size={14} /> Generate PDF
                  </button>
                  <button type="button" className="submit-btn slim" onClick={printPrescription} disabled={working || !pdfPreviewHtml}>
                    <FileText size={14} /> Print PDF
                  </button>
                  <button type="button" className="patient-secondary-btn" onClick={completeConsultation} disabled={working}>
                    <CheckCircle2 size={14} /> Mark Completed
                  </button>
                </div>
              </section>

              <section className="consultation-prescription-right">
                {pdfPreviewHtml ? (
                  <iframe className="consultation-pdf-frame" title="Prescription PDF Preview" srcDoc={pdfPreviewHtml} />
                ) : (
                  <div className="consultation-pdf-placeholder">
                    <p>Generate PDF to preview it here.</p>
                  </div>
                )}
              </section>
            </div>
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

export default DoctorConsultationsPage;
