import { useEffect, useState } from 'react';
import { getPrescriptionByConsultationId } from '../../api/consultations';
import { getPatientConsultations } from '../../api/patients';
import { formatDate, titleCase } from '../../utils/formatters';

function PatientConsultationsPage() {
  const [consultations, setConsultations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [prescription, setPrescription] = useState(null);
  const [prescriptionError, setPrescriptionError] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getPatientConsultations();
        setConsultations(response?.data || []);
      } catch (e) {
        setError(e?.response?.data?.error?.message || 'Failed to load consultations.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const openPrescription = async (consultationId) => {
    setPrescription(null);
    setPrescriptionError('');
    setModalOpen(true);

    try {
      const response = await getPrescriptionByConsultationId(consultationId);
      setPrescription(response?.data || null);
    } catch (e) {
      setPrescriptionError(
        e?.response?.data?.error?.message ||
          'Prescription could not be loaded from this account context.'
      );
    }
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
                <button type="button" className="text-btn" onClick={() => openPrescription(row.id)}>
                  View Prescription
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
              <h3>Prescription</h3>
              <button className="text-btn" type="button" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            {!prescription && !prescriptionError ? <p className="muted">Loading prescription...</p> : null}
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
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PatientConsultationsPage;
