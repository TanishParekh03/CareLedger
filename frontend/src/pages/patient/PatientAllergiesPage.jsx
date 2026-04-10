import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, FlaskConical, PencilLine, ShieldAlert, Trash2 } from 'lucide-react';
import { createAllergy, deleteAllergy, getAllergies, updateAllergy } from '../../api/patients';
import { titleCase } from '../../utils/formatters';

const INITIAL_FORM = { allergen: '', severity: 'mild' };

function getFriendlyMessage(error, fallback) {
  const status = error?.response?.status;
  const code = error?.response?.data?.error?.code;

  if (status === 404) return '';
  if (status === 400 || code === 'VALIDATION_ERROR') return 'Please check the allergy details and try again.';
  if (status === 409 || code === 'CONFLICT') return 'This allergy already exists in your records.';
  return fallback;
}

function PatientAllergiesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState('');
  const [notice, setNotice] = useState({ type: '', text: '' });

  const { data: allergiesRes, isLoading: loading } = useQuery({
    queryKey: ['patient-allergies'],
    queryFn: getAllergies,
  });
  const allergies = allergiesRes?.data || [];

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId('');
  };

  const createMutation = useMutation({
    mutationFn: createAllergy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-allergies'] });
      resetForm();
      setNotice({ type: 'success', text: 'Allergy added.' });
    },
    onError: (e) => setNotice({ type: 'error', text: getFriendlyMessage(e, 'Unable to save allergy right now.') })
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateAllergy(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-allergies'] });
      resetForm();
      setNotice({ type: 'success', text: 'Allergy updated.' });
    },
    onError: (e) => setNotice({ type: 'error', text: getFriendlyMessage(e, 'Unable to save allergy right now.') })
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAllergy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-allergies'] });
      setNotice({ type: 'success', text: 'Allergy deleted.' });
    },
    onError: (e) => setNotice({ type: 'error', text: getFriendlyMessage(e, 'Unable to delete allergy right now.') })
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    setNotice({ type: '', text: '' });
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this allergy?')) return;
    setNotice({ type: '', text: '' });
    deleteMutation.mutate(id);
  };

  const severeCount = allergies.filter((item) => item.severity === 'severe').length;

  return (
    <section className="patient-page-luxe">
      <div className="panel luxe-section-card">
        <div className="panel-head">
          <h3>{editingId ? 'Edit Allergy' : 'Add Allergy'}</h3>
          <span className="luxe-pill-tag">Risk Profile</span>
        </div>

        <p className="patient-inline-note">
          Track reactions and severity so your care team can make safer medication choices.
        </p>

        <form className="inline-form" onSubmit={onSubmit}>
          <input
            placeholder="Allergen"
            value={form.allergen}
            onChange={(e) => setForm((prev) => ({ ...prev, allergen: e.target.value }))}
            required
          />
          <select
            value={form.severity}
            onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value }))}
          >
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
          <button className="submit-btn slim" type="submit">
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId ? (
            <button type="button" className="text-btn" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </form>

        <div className="luxe-chip-row">
          <span>{allergies.length} Logged Allergies</span>
          <span>{severeCount} Severe Alerts</span>
        </div>
      </div>

      <div className="panel luxe-section-card">
        <div className="panel-head">
          <h3>Allergy Records</h3>
          <span className="luxe-subtle-count">{allergies.length} items</span>
        </div>

        {loading ? <p className="muted">Loading allergies...</p> : null}

        {!loading && allergies.length === 0 ? (
          <div className="luxe-empty-mini">
            <FlaskConical size={18} />
            <p>No allergies recorded yet.</p>
          </div>
        ) : null}

        {allergies.length > 0 ? (
          <div className="allergy-records-grid">
            {allergies.map((item) => (
              <article key={item.id} className="allergy-record-card">
                <div className="allergy-record-head">
                  <div className="allergy-record-icon" aria-hidden="true">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h4>{item.allergen}</h4>
                    <p>Monitor and share with doctors</p>
                  </div>
                </div>

                <span
                  className={`status-pill ${item.severity === 'severe' ? 'danger' : item.severity === 'moderate' ? 'warn' : 'neutral'}`}
                >
                  {titleCase(item.severity)} Risk
                </span>

                <div className="allergy-record-actions">
                  <button
                    type="button"
                    className="allergy-action-btn"
                    onClick={() => {
                      setEditingId(item.id);
                      setForm({ allergen: item.allergen, severity: item.severity });
                    }}
                  >
                    <PencilLine size={14} /> Edit
                  </button>
                  <button type="button" className="allergy-action-btn danger" onClick={() => onDelete(item.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      {notice.text ? (
        <p className={notice.type === 'error' ? 'patient-soft-error' : 'patient-soft-success'}>
          {notice.type === 'error' ? <AlertTriangle size={14} /> : null}
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}

export default PatientAllergiesPage;
