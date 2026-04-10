import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPrescriptionByConsultationId } from '../../api/consultations';
import { getPatientConsultations } from '../../api/patients';
import { formatDate, titleCase } from '../../utils/formatters';

function PatientConsultationsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  const { data: consultationsRes, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['patient-consultations'],
    queryFn: getPatientConsultations,
  });
  const consultations = consultationsRes?.data || [];
  const error = fetchError ? fetchError?.response?.data?.error?.message || 'Failed to load consultations.' : '';

  const { data: prescriptionRes, isLoading: prescriptionLoading, error: presError } = useQuery({
    queryKey: ['prescription', selectedConsultation?.id],
    queryFn: () => getPrescriptionByConsultationId(selectedConsultation.id),
    enabled: !!selectedConsultation?.id,
    retry: false
  });
  const prescription = prescriptionRes?.data || null;
  const prescriptionError = presError ? presError?.response?.data?.error?.message || 'Prescription could not be loaded.' : '';

  const openPrescription = (row) => {
    setSelectedConsultation(row);
    setModalOpen(true);
  };

  return (
    <section className="panel luxe-section-card patient-page-luxe">
      <div className="panel-head">
        <h3>Consultations</h3>
        <span className="luxe-subtle-count">{consultations.length} entries</span>
      </div>

      {loading ? <p className="muted">Loading consultations...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Doctor</th>
            <th>Date</th>
            <th>Status</th>
            <th>Prescription</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map((row) => (
            <tr key={row.id}>
              <td>{row.doctor_name || '-'}</td>
              <td>{formatDate(row.consultation_date)}</td>
              <td>
                <span className={`status-pill ${row.status === 'completed' ? 'success' : 'warn'}`}>
                  {titleCase(row.status)}
                </span>
              </td>
              <td>
                <button type="button" className="text-btn" onClick={() => openPrescription(row)}>
                  View Details
                </button>
              </td>
            </tr>
          ))}
          {!loading && consultations.length === 0 ? (
            <tr>
              <td className="patient-empty" colSpan={4}>
                No consultations found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {modalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="panel-head split">
              <h3>Consultation Details</h3>
              <button className="text-btn" type="button" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            {selectedConsultation ? (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#f9f9f6', borderRadius: '8px', border: '1px solid #eeedea', fontSize: '13px' }}>
                <p style={{ margin: '0 0 6px 0' }}><strong>Started:</strong> {new Date(selectedConsultation.consultation_date).toLocaleString()}</p>
                {selectedConsultation.updated_at && String(selectedConsultation.status).toLowerCase() === 'completed' ? (
                  <p style={{ margin: 0 }}><strong>Ended:</strong> {new Date(selectedConsultation.updated_at).toLocaleString()}</p>
                ) : null}
              </div>
            ) : null}

            {!prescription && !prescriptionError ? <p className="muted">Loading details...</p> : null}
            {prescriptionError ? <p className="error-text">{prescriptionError}</p> : null}

            {prescription?.items?.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Drug</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration (days)</th>
                  </tr>
                </thead>
                <tbody>
                  {prescription.items.map((item, index) => (
                    <tr key={`${item.drug_name}-${index}`}>
                      <td>{item.drug_name}</td>
                      <td>{item.dosage}</td>
                      <td>{item.frequency}</td>
                      <td>{item.duration_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {prescription?.doctor_notes ? (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '10px' }}>Doctor Notes</h4>
                <div style={{ padding: '12px', background: '#fcfcfb', borderRadius: '8px', border: '1px solid #eeedea', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {prescription.doctor_notes}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PatientConsultationsPage;
