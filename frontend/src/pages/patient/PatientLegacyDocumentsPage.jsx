import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileImage, FileText, UploadCloud } from 'lucide-react';
import {
  getOwnPatientProfile,
  getPatientPrescriptionById,
  uploadLegacyPrescriptionDocument,
} from '../../api/patients';
import { formatDate } from '../../utils/formatters';

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']);

function toFriendlyMessage(error, fallback) {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;
  const message = error?.response?.data?.error?.message;
  const timeoutCode = error?.code;
  const timeoutMessage = String(error?.message || '');

  if (typeof message === 'string' && message.trim()) return message;
  if (timeoutCode === 'ECONNABORTED' || /timeout/i.test(timeoutMessage)) {
    return 'Upload is taking longer than expected. The document may still be processing on the server. Check Past Prescriptions before retrying.';
  }
  if (status === 400 || code === 'VALIDATION_ERROR') return 'Upload failed. Use one image or a single-page PDF under 10 MB.';
  if (status === 403 || code === 'FORBIDDEN') return 'Only patient accounts can upload legacy prescriptions.';
  if (status === 404 || code === 'NOT_FOUND') return 'Patient profile not found. Complete your profile and retry.';
  if (status === 503 || code === 'OCR_NOT_READY') return 'OCR service is starting up. Please retry in a moment.';
  return fallback;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function PatientLegacyDocumentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [latestPrescription, setLatestPrescription] = useState(null);
  const [loadingLatestPrescription, setLoadingLatestPrescription] = useState(false);

  const { data: profileRes } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: getOwnPatientProfile,
  });

  const profile = profileRes?.data || null;

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadLegacyPrescriptionDocument(file),
    onSuccess: async (response) => {
      const prescriptionId = response?.data?.prescription_id;

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setNotice({
        type: 'success',
        text: `Legacy prescription imported. ${response?.data?.drugs_count || 0} medicine entries were saved.`,
      });

      if (prescriptionId) {
        setLoadingLatestPrescription(true);
        try {
          const latestRes = await queryClient.fetchQuery({
            queryKey: ['patient-prescription', prescriptionId],
            queryFn: () => getPatientPrescriptionById(prescriptionId),
          });
          setLatestPrescription(latestRes?.data || null);
        } catch {
          setLatestPrescription(null);
        } finally {
          setLoadingLatestPrescription(false);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
    },
    onError: (error) => {
      setLatestPrescription(null);
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
      setNotice({ type: 'error', text: toFriendlyMessage(error, 'Unable to process the uploaded document.') });
    },
  });

  const onFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setNotice({ type: '', text: '' });

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setNotice({ type: 'error', text: 'Only JPEG, JPG, PNG, or PDF files are allowed.' });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      setNotice({ type: 'error', text: 'File too large. Upload a file up to 10 MB.' });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    setNotice({ type: '', text: '' });

    if (!selectedFile) {
      setNotice({ type: 'error', text: 'Select a document before uploading.' });
      return;
    }

    uploadMutation.mutate(selectedFile);
  };

  return (
    <section className="patient-page-luxe legacy-upload-page">
      <div className="panel luxe-section-card">
        <div className="panel-head split">
          <h3>Legacy Prescription Upload</h3>
          <span className="luxe-pill-tag">OCR Import</span>
        </div>

        <p className="patient-inline-note">
          Upload one document at a time to import old prescriptions into your past prescription history.
        </p>

        <div className="luxe-chip-row">
          <span>Accepted: JPG, PNG, PDF</span>
          <span>PDF must be single-page</span>
          <span>Max size: 10 MB</span>
        </div>
      </div>

      <div className="panel luxe-section-card legacy-upload-card">
        <form className="legacy-upload-form" onSubmit={onSubmit}>
          <label className="legacy-upload-dropzone">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={onFileChange}
              disabled={uploadMutation.isPending}
            />
            <span className="legacy-upload-icon" aria-hidden="true">
              <UploadCloud size={18} />
            </span>
            <span className="legacy-upload-title">Select Legacy Document</span>
            <span className="legacy-upload-caption">Use one image or one single-page PDF file.</span>
          </label>

          {selectedFile ? (
            <div className="legacy-file-chip">
              {selectedFile.type === 'application/pdf' ? <FileText size={14} /> : <FileImage size={14} />}
              <span>{selectedFile.name}</span>
              <small>{formatFileSize(selectedFile.size)}</small>
            </div>
          ) : null}

          <div className="doctor-form-actions">
            <button type="submit" className="submit-btn slim" disabled={uploadMutation.isPending || !selectedFile}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload and Import'}
            </button>
          </div>

          {uploadMutation.isPending ? (
            <p className="muted legacy-context-line">Running OCR and saving prescription. Please wait...</p>
          ) : null}
        </form>

        {notice.text ? (
          <p className={notice.type === 'error' ? 'patient-soft-error' : 'patient-soft-success'}>
            {notice.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            {notice.text}
          </p>
        ) : null}
      </div>

      <div className="panel luxe-section-card">
        <div className="panel-head split">
          <h3>Import Context</h3>
          <span className="luxe-subtle-count">Patient scoped</span>
        </div>

        <p className="muted legacy-context-line">
          Imported at: {formatDate(new Date().toISOString())}
        </p>
        <p className="muted legacy-context-line">
          Patient: {profile?.full_name || 'Unknown'} ({profile?.health_id || 'No health ID'})
        </p>
      </div>

      {loadingLatestPrescription ? <p className="muted">Loading imported prescription details...</p> : null}

      {latestPrescription ? (
        <div className="panel luxe-section-card">
          <div className="panel-head split">
            <h3>Imported Prescription</h3>
            <span className="luxe-subtle-count">Shown immediately after upload</span>
          </div>

          <div className="legacy-import-meta">
            <p><strong>Prescription ID:</strong> {latestPrescription.prescription_id}</p>
            <p><strong>Recorded:</strong> {formatDate(latestPrescription.issued_at || latestPrescription.created_at)}</p>
            <p><strong>Source:</strong> {latestPrescription.is_legacy_import ? 'Legacy upload' : 'Consultation'}</p>
          </div>

          {Array.isArray(latestPrescription.items) && latestPrescription.items.length > 0 ? (
            <div className="active-medications-table-wrap">
              <table className="table active-medications-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Drug</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration (days)</th>
                  </tr>
                </thead>
                <tbody>
                  {latestPrescription.items.map((item, index) => (
                    <tr key={`${item.drug_name || 'drug'}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{item.drug_name || '-'}</td>
                      <td>{item.dosage || '-'}</td>
                      <td>{item.frequency || '-'}</td>
                      <td>{item.duration_days || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No medicine rows were extracted from the uploaded document.</p>
          )}

          {latestPrescription.doctor_notes ? (
            <p className="legacy-notes"><strong>Notes:</strong> {latestPrescription.doctor_notes}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default PatientLegacyDocumentsPage;
