import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FileText,
  LoaderCircle,
  Notebook,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { getDoctorClinics } from '../../api/clinics';
import { getDoctorConsultations } from '../../api/doctors';
import {
  createPatientCondition,
  deletePatientCondition,
  finalizeConsultation,
  getConsultationPrescription,
  getPatientSnapshotAllergies,
  getPatientSnapshotConditions,
  getPatientSnapshotEmergency,
  getPatientSnapshotProfile,
  searchPatientsForConsultation,
  startConsultation,
  updatePatientCondition,
  upsertConsultationPrescription,
} from '../../api/doctorConsultations';
import { formatDate, titleCase } from '../../utils/formatters';

const EMPTY_ITEM = {
  drug_name: '',
  dosage: '',
  frequency: '',
  duration_days: '',
};

const INITIAL_CONDITION_FORM = {
  condition_name: '',
  status: 'active',
  diagnosed_date: '',
};

function toFriendlyMessage(error, fallback) {
  const message = error?.response?.data?.error?.message;
  if (message && typeof message === 'string') return message;
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;
  if (status === 400 || code === 'VALIDATION_ERROR') return 'Please review the form fields and try again.';
  if (status === 403 || code === 'FORBIDDEN') return 'You need active patient access to continue.';
  if (status === 404 || code === 'NOT_FOUND') return 'No matching data was found.';
  if (status === 409 || code === 'CONFLICT') return 'This record conflicts with existing data.';
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
  const queryClient = useQueryClient();

  // ── Search state ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // ── Confirmation modal ──
  const [confirmPatient, setConfirmPatient] = useState(null);

  // ── Workspace state ──
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [consultationId, setConsultationId] = useState('');

  // ── Snapshot ──
  const [snapshot, setSnapshot] = useState({
    profile: null,
    allergies: [],
    conditions: [],
    emergency: [],
  });
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  // ── Clinics ──
  const [clinicId, setClinicId] = useState('');

  // ── Prescription ──
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [pdfPreviewHtml, setPdfPreviewHtml] = useState('');

  // ── Chronic conditions ──
  const [conditionForm, setConditionForm] = useState({ ...INITIAL_CONDITION_FORM });
  const [editingConditionId, setEditingConditionId] = useState('');

  // ── Past consultation detail modal ──
  const [pastDetail, setPastDetail] = useState(null);
  const [pastDetailLoading, setPastDetailLoading] = useState(false);
  const [pastDetailError, setPastDetailError] = useState('');

  // ── General ──
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });

  const { data: consultationLogRes, isLoading: loadingConsultationLog } = useQuery({
    queryKey: ['consultationLog'],
    queryFn: getDoctorConsultations,
  });
  const consultationLog = consultationLogRes?.data || [];

  const { data: clinicsRes } = useQuery({
    queryKey: ['clinics'],
    queryFn: getDoctorClinics,
  });
  const clinics = clinicsRes?.data || [];

  const selectedClinic = useMemo(() => clinics.find((c) => c.id === clinicId) || null, [clinics, clinicId]);



  useEffect(() => {
    if (!clinicId && clinics.length > 0) {
      setClinicId(clinics[0].id);
    }
  }, [clinics, clinicId]);

  useEffect(() => {
    const initialLoad = async () => {
      setSearching(true);
      try {
        const data = await searchPatientsForConsultation('', 12);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    };
    initialLoad();
  }, []);

  // ── Auto-save to localStorage ──
  useEffect(() => {
    if (!consultationId) return;
    const cacheKey = `consultation_cache_${consultationId}`;
    const dataToStore = {
      snapshot,
      items,
      doctorNotes,
      clinicId,
    };
    try {
      localStorage.setItem(cacheKey, JSON.stringify(dataToStore));
    } catch (e) {
      console.warn("Failed to write to local storage", e);
    }
  }, [items, doctorNotes, clinicId, snapshot, consultationId]);

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
        ? response.data.items.filter((i) => i?.drug_name || i?.dosage || i?.frequency || i?.duration_days)
        : [];
      setItems(rows.length > 0 ? rows.map((i) => ({ ...EMPTY_ITEM, ...i })) : [{ ...EMPTY_ITEM }]);
      setDoctorNotes(response?.data?.doctor_notes || '');
    } catch {
      setItems([{ ...EMPTY_ITEM }]);
      setDoctorNotes('');
    }
  };

  // ── Search ──
  const runSearch = async (event) => {
    event?.preventDefault();
    setSearching(true);
    setNotice({ type: '', text: '' });
    try {
      const data = await searchPatientsForConsultation(query, 12);
      setResults(data);
      if (data.length === 0) setNotice({ type: 'error', text: 'No patients found for this search.' });
    } catch (error) {
      setResults([]);
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Patient search failed.') });
    } finally {
      setSearching(false);
    }
  };

  // ── Patient card click → confirmation modal ──
  const onPatientCardClick = (row) => {
    if (row.active_consultation_id) {
      // Already has an active consultation — go directly to workspace
      openWorkspace(row);
    } else if (row.has_active_access) {
      // Has access but no consultation — show confirmation
      setConfirmPatient(row);
    } else {
      // No access — show error
      setNotice({ type: 'error', text: 'Patient has not granted access yet. Consultation cannot be started.' });
    }
  };

  const confirmStartConsultation = async () => {
    if (!confirmPatient) return;
    setWorking(true);
    try {
      const response = await startConsultation(confirmPatient.id);
      const nextConsultationId = response?.data?.id;
      if (!nextConsultationId) throw new Error('Missing consultation id');

      const updatedPatient = {
        ...confirmPatient,
        has_active_access: true,
        active_consultation_id: nextConsultationId,
      };

      setResults((prev) =>
        prev.map((item) => (item.id === confirmPatient.id ? updatedPatient : item)),
      );

      setConfirmPatient(null);
      openWorkspace(updatedPatient);
      queryClient.invalidateQueries({ queryKey: ['consultationLog'] });
      setNotice({ type: 'success', text: 'Consultation started successfully.' });
    } catch (error) {
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Unable to start consultation.') });
    } finally {
      setWorking(false);
    }
  };

  // ── Open workspace ──
  const openWorkspace = async (row) => {
    setWorkspaceOpen(true);
    setSelectedPatient(row);
    setPdfPreviewHtml('');
    setNotice({ type: '', text: '' });

    // Initial reset
    let initialSnapshot = { profile: null, allergies: [], conditions: [], emergency: [] };
    let initialItems = [{ ...EMPTY_ITEM }];
    let initialDoctorNotes = '';
    let hasFullCache = false;

    if (row.active_consultation_id) {
      setConsultationId(row.active_consultation_id);
      const cacheKey = `consultation_cache_${row.active_consultation_id}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.snapshot) initialSnapshot = parsed.snapshot;
          if (parsed.items && parsed.items.length > 0) initialItems = parsed.items;
          if (parsed.doctorNotes !== undefined) initialDoctorNotes = parsed.doctorNotes;
          if (parsed.clinicId) setClinicId(parsed.clinicId);
          hasFullCache = true;
        }
      } catch (e) {
        console.warn("Failed to read from local storage", e);
      }
    } else {
      setConsultationId('');
    }

    setSnapshot(initialSnapshot);
    setItems(initialItems);
    setDoctorNotes(initialDoctorNotes);
    setConditionForm({ ...INITIAL_CONDITION_FORM });
    setEditingConditionId('');

    if (row.active_consultation_id) {
      const promises = [];
      if (!hasFullCache || !initialSnapshot.profile) promises.push(loadSnapshot(row.id));
      if (!hasFullCache) promises.push(loadPrescription(row.active_consultation_id));
      if (promises.length > 0) await Promise.allSettled(promises);
      return;
    }

    if (row.has_active_access && !hasFullCache) {
      await loadSnapshot(row.id);
    }
  };

  const closeWorkspace = () => {
    setWorkspaceOpen(false);
    setPdfPreviewHtml('');
    setSelectedPatient(null);
    setConsultationId('');
  };

  // ── Prescription helpers ──
  const updateItem = (index, key, value) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)));
  };

  const addRow = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const deleteRow = (index) => {
    setItems((prev) => (prev.length === 1 ? [{ ...EMPTY_ITEM }] : prev.filter((_, idx) => idx !== index)));
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

    return { ok: !invalid && cleaned.length > 0, items: invalid ? [] : cleaned };
  };

  const savePrescription = async () => {
    if (!consultationId) {
      setNotice({ type: 'error', text: 'Start a consultation before saving prescription.' });
      return;
    }
    const payload = buildPayload();
    if (!payload.ok) {
      setNotice({ type: 'error', text: 'Complete every medicine row before saving.' });
      return;
    }
    try {
      setWorking(true);
      await upsertConsultationPrescription(consultationId, payload.items, doctorNotes);
      setNotice({ type: 'success', text: 'Prescription saved successfully.' });
    } catch (error) {
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Failed to save prescription.') });
    } finally {
      setWorking(false);
    }
  };

  // ── PDF generation ──
  const generatePdf = () => {
    if (!consultationId) {
      setNotice({ type: 'error', text: 'Start a consultation before creating PDF.' });
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

    const notesHtml = doctorNotes
      ? `<p class="rx-notes"><strong>Doctor's Notes:</strong> ${escapeHtml(doctorNotes)}</p>`
      : `<p class="rx-notes"><strong>Notes:</strong> Follow dosage schedule exactly as prescribed. In case of adverse reaction, seek medical care immediately.</p>`;

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

              ${notesHtml}
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
    setNotice({ type: 'success', text: 'PDF preview generated.' });
  };

  const printPrescription = () => {
    if (!pdfPreviewHtml) {
      setNotice({ type: 'error', text: 'Generate PDF preview first.' });
      return;
    }
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
    if (!printWindow) {
      setNotice({ type: 'error', text: 'Popup blocked. Allow popups to print.' });
      return;
    }
    printWindow.document.open();
    printWindow.document.write(pdfPreviewHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  // ── Chronic condition helpers ──
  const resetConditionForm = () => {
    setConditionForm({ ...INITIAL_CONDITION_FORM });
    setEditingConditionId('');
  };

  const onConditionSubmit = async (e) => {
    e.preventDefault();
    if (!consultationId) return;
    setNotice({ type: '', text: '' });
    try {
      setWorking(true);
      if (editingConditionId) {
        await updatePatientCondition(consultationId, editingConditionId, conditionForm);
        setNotice({ type: 'success', text: 'Condition updated.' });
      } else {
        await createPatientCondition(consultationId, conditionForm);
        setNotice({ type: 'success', text: 'Condition added.' });
      }
      resetConditionForm();
      // Reload conditions
      if (selectedPatient) {
        const conditionRes = await getPatientSnapshotConditions(selectedPatient.id);
        setSnapshot((prev) => ({ ...prev, conditions: conditionRes?.data || [] }));
      }
    } catch (error) {
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Unable to save condition.') });
    } finally {
      setWorking(false);
    }
  };

  const onConditionDelete = async (id) => {
    if (!window.confirm('Delete this chronic condition?')) return;
    if (!consultationId) return;
    try {
      setWorking(true);
      await deletePatientCondition(consultationId, id);
      setNotice({ type: 'success', text: 'Condition deleted.' });
      if (selectedPatient) {
        const conditionRes = await getPatientSnapshotConditions(selectedPatient.id);
        setSnapshot((prev) => ({ ...prev, conditions: conditionRes?.data || [] }));
      }
    } catch (error) {
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Unable to delete condition.') });
    } finally {
      setWorking(false);
    }
  };

  const startEditCondition = (condition) => {
    setConditionForm({
      condition_name: condition.condition_name,
      status: condition.status,
      diagnosed_date: condition.diagnosed_date || '',
    });
    setEditingConditionId(condition.id);
  };

  // ── Finalize ──
  const handleFinalize = async () => {
    if (!consultationId) {
      setNotice({ type: 'error', text: 'No active consultation to finalize.' });
      return;
    }
    if (!window.confirm('Finalize this consultation? This will mark it as completed.')) return;

    const payload = buildPayload();
    try {
      setWorking(true);
      await finalizeConsultation(consultationId, payload.ok ? payload.items : [], doctorNotes);
      try {
        localStorage.removeItem(`consultation_cache_${consultationId}`);
      } catch (e) {
        console.warn("Failed to clear local storage", e);
      }
      queryClient.invalidateQueries({ queryKey: ['consultationLog'] });
      setNotice({ type: 'success', text: 'Consultation finalized successfully.' });

      if (selectedPatient) {
        setResults((prev) =>
          prev.map((item) =>
            item.id === selectedPatient.id ? { ...item, active_consultation_id: null } : item,
          ),
        );
      }

      closeWorkspace();
    } catch (error) {
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Unable to finalize consultation.') });
    } finally {
      setWorking(false);
    }
  };

  // ── Past consultation detail ──
  const handleConsultationLogClick = (item) => {
    // If it's in progress, reconstruct mock patient state and open the live workspace
    if (String(item.status).toLowerCase() === 'in_progress') {
      const mockPatient = {
        id: item.patient_id,
        full_name: item.patient_name || 'Patient',
        health_id: item.health_id,
        active_consultation_id: item.id,
        has_active_access: true,
      };
      openWorkspace(mockPatient);
    } else {
      openPastDetail(item);
    }
  };

  const openPastDetail = async (item) => {
    setPastDetail(item);
    setPastDetailLoading(true);
    setPastDetailError('');

    try {
      const res = await getConsultationPrescription(item.id);
      const prescription = res?.data || null;
      setPastDetail((prev) => ({ ...prev, prescription }));
    } catch {
      setPastDetailError('No prescription data available for this consultation.');
    } finally {
      setPastDetailLoading(false);
    }
  };

  const canPrescribe = Boolean(consultationId);

  const activeConditions = snapshot.conditions.filter((c) => c.status === 'active').length;
  const managedConditions = snapshot.conditions.filter((c) => c.status === 'managed').length;
  const resolvedConditions = snapshot.conditions.filter((c) => c.status === 'resolved').length;

  return (
    <section className="doctor-page-luxe consultation-artboard-page">
      {/* ── Hero search ── */}
      <article className="doctor-card consultation-artboard-hero">
        <div className="panel-head split">
          <div>
            <h3>Consultation Studio</h3>
            <p className="muted consultation-artboard-sub">
              Search patient, start consultation, and manage prescriptions.
            </p>
          </div>
          <span className="luxe-pill-tag">Patient Lookup + Rx</span>
        </div>

        <form className="consultation-artboard-search" onSubmit={runSearch}>
          <input
            type="text"
            placeholder="Search by full name or health ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="submit-btn slim" disabled={searching}>
            {searching ? <LoaderCircle size={16} className="spin" /> : <Search size={16} />} Search
          </button>
        </form>
      </article>

      {/* ── Patient results grid ── */}
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
                onClick={() => onPatientCardClick(row)}
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

      {/* ── Consultation log ── */}
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
              <article
                key={item.id}
                className="consultation-log-card-item consultation-log-clickable"
                onClick={() => handleConsultationLogClick(item)}
                role="button"
                tabIndex={0}
              >
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

      {/* ── Confirmation Modal ── */}
      {confirmPatient ? (
        <div className="confirm-start-overlay" onClick={() => setConfirmPatient(null)}>
          <article className="confirm-start-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-start-icon-wrap">
              <Stethoscope size={32} />
            </div>
            <h3>Start Consultation</h3>
            <p>
              Begin a new consultation session with <strong>{confirmPatient.full_name}</strong>?
            </p>
            {confirmPatient.health_id ? (
              <p className="confirm-health-id">Health ID: {confirmPatient.health_id}</p>
            ) : null}
            <div className="confirm-start-actions">
              <button
                type="button"
                className="patient-secondary-btn"
                onClick={() => setConfirmPatient(null)}
                disabled={working}
              >
                Cancel
              </button>
              <button
                type="button"
                className="submit-btn slim"
                onClick={confirmStartConsultation}
                disabled={working}
              >
                {working ? <LoaderCircle size={14} className="spin" /> : <Stethoscope size={14} />}
                {working ? ' Starting...' : ' Confirm & Start'}
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {/* ── Full Consultation Workspace ── */}
      {workspaceOpen && selectedPatient ? (
        <div className="consult-workspace-overlay">
          <article className="consult-workspace-shell">
            {/* ── Workspace header ── */}
            <header className="consult-workspace-header">
              <div className="consult-workspace-header-left">
                <div className="consult-ws-avatar">
                  {(snapshot.profile?.full_name || selectedPatient.full_name || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{snapshot.profile?.full_name || selectedPatient.full_name}</h3>
                  <p>{snapshot.profile?.health_id || selectedPatient.health_id || 'Health ID unavailable'}</p>
                </div>
              </div>
              <div className="consult-workspace-header-right">
                {consultationId ? (
                  <span className="status-chip success">Active consultation</span>
                ) : (
                  <span className="status-chip muted">No consultation</span>
                )}

                {/* Patient info pills */}
                {snapshot.profile ? (
                  <>
                    {snapshot.profile.gender ? (
                      <span className="consult-info-pill">{titleCase(snapshot.profile.gender)}</span>
                    ) : null}
                    {snapshot.profile.blood_group ? (
                      <span className="consult-info-pill">{snapshot.profile.blood_group}</span>
                    ) : null}
                  </>
                ) : null}

                {/* Allergy compact */}
                {snapshot.allergies.length > 0 ? (
                  <span className="consult-info-pill warn">
                    <ShieldAlert size={12} /> {snapshot.allergies.length} Allergies
                  </span>
                ) : null}

                <button type="button" className="icon-button" onClick={closeWorkspace} aria-label="Close workspace">
                  <X size={18} />
                </button>
              </div>
            </header>

            {loadingSnapshot ? <p className="muted" style={{ padding: '12px 20px' }}>Loading patient data...</p> : null}

            {/* ── 3-section layout ── */}
            {canPrescribe ? (
              <div className="consult-workspace-body">
                {/* ── Section 1: Prescription (left full height) ── */}
                <section className="consult-section-prescription">
                  <div className="consult-section-head">
                    <FileText size={16} />
                    <h4>Prescription</h4>
                  </div>

                  <div className="consult-context-row">
                    <p>
                      <strong>Consultation:</strong> {consultationId.slice(0, 12)}…
                    </p>
                    <label>
                      Clinic
                      <select value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
                        <option value="">Select clinic</option>
                        {clinics.map((clinic) => (
                          <option key={clinic.id} value={clinic.id}>
                            {clinic.clinic_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="prescription-rows-scroll">
                    {items.map((item, index) => (
                      <div key={`item-${index}`} className="prescription-row">
                        <label>
                          Medicine
                          <input
                            value={item.drug_name}
                            onChange={(e) => updateItem(index, 'drug_name', e.target.value)}
                            placeholder="e.g. Paracetamol"
                          />
                        </label>
                        <label>
                          Dosage
                          <input
                            value={item.dosage}
                            onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                            placeholder="e.g. 500 mg"
                          />
                        </label>
                        <label>
                          Frequency
                          <input
                            value={item.frequency}
                            onChange={(e) => updateItem(index, 'frequency', e.target.value)}
                            placeholder="e.g. 1-0-1"
                          />
                        </label>
                        <label>
                          Duration (days)
                          <input
                            type="number"
                            min="1"
                            value={item.duration_days}
                            onChange={(e) => updateItem(index, 'duration_days', e.target.value)}
                            placeholder="5"
                          />
                        </label>
                        <button
                          type="button"
                          className="clinic-action-btn danger"
                          onClick={() => deleteRow(index)}
                          aria-label={`Delete row ${index + 1}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="consult-rx-actions">
                    <button type="button" className="patient-secondary-btn" onClick={addRow}>
                      <Plus size={14} /> Add Medicine
                    </button>
                    <button type="button" className="submit-btn slim" onClick={savePrescription} disabled={working}>
                      Save Prescription
                    </button>
                    <button type="button" className="submit-btn slim" onClick={generatePdf} disabled={working}>
                      <FileText size={14} /> Preview PDF
                    </button>
                    <button
                      type="button"
                      className="submit-btn slim"
                      onClick={printPrescription}
                      disabled={working || !pdfPreviewHtml}
                    >
                      <FileText size={14} /> Print PDF
                    </button>
                  </div>

                  {/* PDF preview */}
                  {pdfPreviewHtml ? (
                    <div className="consult-pdf-preview">
                      <iframe className="consultation-pdf-frame" title="PDF Preview" srcDoc={pdfPreviewHtml} />
                    </div>
                  ) : null}
                </section>

                {/* ── Right column ── */}
                <div className="consult-section-right-col">
                  {/* ── Section 2: Chronic Conditions (right ~50%) ── */}
                  <section className="consult-section-conditions">
                    <div className="consult-section-head">
                      <ShieldCheck size={16} />
                      <h4>Chronic Conditions</h4>
                    </div>

                    <div className="consult-chip-row">
                      <span>{activeConditions} Active</span>
                      <span>{managedConditions} Managed</span>
                      <span>{resolvedConditions} Resolved</span>
                    </div>

                    {/* Add / Edit form */}
                    <form className="consult-condition-form" onSubmit={onConditionSubmit}>
                      <input
                        placeholder="Condition Name"
                        value={conditionForm.condition_name}
                        onChange={(e) => setConditionForm((prev) => ({ ...prev, condition_name: e.target.value }))}
                        required
                      />
                      <select
                        value={conditionForm.status}
                        onChange={(e) => setConditionForm((prev) => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="active">Active</option>
                        <option value="managed">Managed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <input
                        type="date"
                        value={conditionForm.diagnosed_date}
                        onChange={(e) => setConditionForm((prev) => ({ ...prev, diagnosed_date: e.target.value }))}
                        placeholder="Diagnosed date"
                      />
                      <button className="submit-btn slim" type="submit" disabled={working}>
                        {editingConditionId ? 'Update' : 'Add'}
                      </button>
                      {editingConditionId ? (
                        <button type="button" className="text-btn" onClick={resetConditionForm}>
                          Cancel
                        </button>
                      ) : null}
                    </form>

                    {/* Condition list */}
                    <div className="consult-conditions-list">
                      {snapshot.conditions.length === 0 ? (
                        <div className="luxe-empty-mini">
                          <ClipboardList size={16} />
                          <p>No chronic conditions recorded.</p>
                        </div>
                      ) : null}
                      {snapshot.conditions.map((condition) => (
                        <div key={condition.id} className="consult-condition-card">
                          <div className="consult-condition-info">
                            <strong>{condition.condition_name}</strong>
                            <span
                              className={`status-pill ${
                                condition.status === 'active'
                                  ? 'success'
                                  : condition.status === 'managed'
                                    ? 'warn'
                                    : 'neutral'
                              }`}
                            >
                              {titleCase(condition.status)}
                            </span>
                            {condition.diagnosed_date ? (
                              <small>
                                <CalendarDays size={11} /> {formatDate(condition.diagnosed_date)}
                              </small>
                            ) : null}
                          </div>
                          <div className="consult-condition-actions">
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => startEditCondition(condition)}
                              aria-label="Edit condition"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              className="icon-button danger"
                              onClick={() => onConditionDelete(condition.id)}
                              aria-label="Delete condition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* ── Section 3: Doctor Notes (right ~50%) ── */}
                  <section className="consult-section-notes">
                    <div className="consult-section-head">
                      <Notebook size={16} />
                      <h4>Doctor Notes</h4>
                    </div>
                    <p className="muted" style={{ fontSize: '12px', margin: '0 0 8px' }}>
                      Notes will be included in the prescription document.
                    </p>
                    <textarea
                      className="consult-notes-textarea"
                      placeholder="Enter consultation notes, advice, follow-up instructions..."
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      rows={5}
                    />
                  </section>
                </div>
              </div>
            ) : (
              <div className="consult-workspace-no-rx">
                <p className="muted">Start a consultation to access the workspace.</p>
              </div>
            )}

            {/* ── Finalize bar ── */}
            {canPrescribe ? (
              <footer className="consult-workspace-footer">
                <button
                  type="button"
                  className="consult-finalize-btn"
                  onClick={handleFinalize}
                  disabled={working}
                >
                  {working ? <LoaderCircle size={16} className="spin" /> : <CheckCircle2 size={16} />}
                  Finalize Consultation
                </button>
              </footer>
            ) : null}
          </article>
        </div>
      ) : null}

      {/* ── Past Consultation Detail Modal ── */}
      {pastDetail ? (
        <div className="confirm-start-overlay" onClick={() => setPastDetail(null)}>
          <article className="past-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="past-detail-header">
              <h3>Consultation Details</h3>
              <button type="button" className="icon-button" onClick={() => setPastDetail(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="past-detail-meta">
              <div className="past-detail-meta-row">
                <UserRound size={14} />
                <span><strong>Patient:</strong> {pastDetail.patient_name || 'N/A'}</span>
              </div>
              <div className="past-detail-meta-row">
                <CalendarDays size={14} />
                <span><strong>Started:</strong> {new Date(pastDetail.consultation_date).toLocaleString()}</span>
              </div>
              {pastDetail.updated_at && String(pastDetail.status).toLowerCase() === 'completed' ? (
                <div className="past-detail-meta-row">
                  <CalendarDays size={14} />
                  <span><strong>Ended:</strong> {new Date(pastDetail.updated_at).toLocaleString()}</span>
                </div>
              ) : null}
              <div className="past-detail-meta-row">
                <Stethoscope size={14} />
                <span>
                  <strong>Status:</strong>{' '}
                  <span
                    className={`status-chip ${
                      String(pastDetail.status).toLowerCase() === 'completed' ? 'success' : ''
                    }`}
                  >
                    {titleCase(pastDetail.status)}
                  </span>
                </span>
              </div>
              {pastDetail.health_id ? (
                <div className="past-detail-meta-row">
                  <FileText size={14} />
                  <span><strong>Health ID:</strong> {pastDetail.health_id}</span>
                </div>
              ) : null}
            </div>

            {pastDetailLoading ? <p className="muted">Loading prescription data...</p> : null}
            {pastDetailError ? <p className="muted">{pastDetailError}</p> : null}

            {pastDetail.prescription?.items?.length > 0 ? (
              <>
                <h4 className="past-detail-sub">Prescribed Medications</h4>
                <table className="table past-detail-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Drug</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastDetail.prescription.items
                      .filter((item) => item.drug_name)
                      .map((item, idx) => (
                        <tr key={`${item.drug_name}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td>{item.drug_name}</td>
                          <td>{item.dosage}</td>
                          <td>{item.frequency}</td>
                          <td>{item.duration_days} days</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </>
            ) : null}

            {pastDetail.prescription?.doctor_notes ? (
              <>
                <h4 className="past-detail-sub">Doctor Notes</h4>
                <div className="past-detail-notes-content">
                  {pastDetail.prescription.doctor_notes}
                </div>
              </>
            ) : null}
          </article>
        </div>
      ) : null}

      {/* ── Global notice ── */}
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
