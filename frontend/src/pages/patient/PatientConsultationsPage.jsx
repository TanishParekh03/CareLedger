import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPatientPrescriptionById, getPatientPrescriptions } from '../../api/patients';
import { formatDate, titleCase } from '../../utils/formatters';

function PatientConsultationsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const { data: prescriptionsRes, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['patient-prescriptions'],
    queryFn: getPatientPrescriptions,
  });
  const prescriptions = prescriptionsRes?.data || [];
  const error = fetchError ? fetchError?.response?.data?.error?.message || 'Failed to load past prescriptions.' : '';

  const { data: prescriptionRes, isLoading: prescriptionLoading, error: presError } = useQuery({
    queryKey: ['patient-prescription', selectedPrescription?.prescription_id],
    queryFn: () => getPatientPrescriptionById(selectedPrescription.prescription_id),
    enabled: !!selectedPrescription?.prescription_id,
    retry: false,
  });
  const prescription = prescriptionRes?.data || null;
  const prescriptionError = presError ? presError?.response?.data?.error?.message || 'Prescription could not be loaded.' : '';

  const openPrescription = (record) => {
    setSelectedPrescription(record);
    setModalOpen(true);
  };

  return (
    <section className="panel luxe-section-card patient-page-luxe">
      <div className="panel-head">
        <h3>Past Prescriptions</h3>
        <span className="luxe-subtle-count">{prescriptions.length} entries</span>
      </div>

      {loading ? <p className="muted">Loading past prescriptions...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Doctor</th>
            <th>Date</th>
            <th>Source</th>
            <th>Items</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {prescriptions.map((row) => (
            <tr key={row.prescription_id}>
              <td>{row.doctor_name || '-'}</td>
              <td>{formatDate(row.reference_date || row.issued_at)}</td>
              <td>
                <span className={`status-pill ${row.is_legacy_import ? 'warn' : 'success'}`}>
                  {row.is_legacy_import ? 'Legacy Import' : titleCase(row.status || 'completed')}
                </span>
              </td>
              <td>{row.items_count || 0}</td>
              <td>
                <button type="button" className="text-btn" onClick={() => openPrescription(row)}>
                  View Details
                </button>
              </td>
            </tr>
          ))}
          {!loading && prescriptions.length === 0 ? (
            <tr>
              <td className="patient-empty" colSpan={5}>
                No past prescriptions found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {modalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="panel-head split">
              <h3>Prescription Details</h3>
              <button className="text-btn" type="button" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            {selectedPrescription ? (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#f9f9f6', borderRadius: '8px', border: '1px solid #eeedea', fontSize: '13px' }}>
                <p style={{ margin: '0 0 6px 0' }}><strong>Recorded:</strong> {new Date(selectedPrescription.reference_date || selectedPrescription.issued_at).toLocaleString()}</p>
                <p style={{ margin: '0 0 6px 0' }}><strong>Source:</strong> {selectedPrescription.is_legacy_import ? 'Legacy upload' : 'Consultation'}</p>
                <p style={{ margin: 0 }}><strong>Consultation ID:</strong> {selectedPrescription.consultation_id || '-'}</p>
              </div>
            ) : null}

            {prescriptionLoading ? <p className="muted">Loading details...</p> : null}
            {!prescriptionLoading && !prescription && !prescriptionError ? <p className="muted">No prescription details available.</p> : null}
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
