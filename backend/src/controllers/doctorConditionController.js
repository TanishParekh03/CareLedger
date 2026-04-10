const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { isUuid } = require('../utils/validators');

/**
 * Doctor-side CRUD for patient chronic conditions.
 * Requires active access permission for the patient tied to the consultation.
 */

async function createPatientCondition(req, res, next) {
  try {
    const { consultationId } = req.params;
    const { condition_name, status, diagnosed_date } = req.body;

    if (!isUuid(consultationId)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'consultationId must be a valid UUID');
    }

    if (!condition_name || !status) {
      return errorResponse(res, 400, 'BAD_REQUEST', 'Missing required fields: condition_name, status');
    }

    const validStatus = ['active', 'managed', 'resolved'];
    if (!validStatus.includes(status.toLowerCase())) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'status must be one of: active, managed, resolved');
    }

    const doctorId = req.doctor?.id;
    if (!doctorId) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Doctor verification context missing');
    }

    // Verify consultation belongs to this doctor and get patient_id
    const consultation = await pool.query(
      `SELECT id, patient_id, status FROM consultations
       WHERE id = $1 AND doctor_id = $2`,
      [consultationId, doctorId]
    );

    if (consultation.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Consultation not found');
    }

    if (consultation.rows[0].status === 'completed') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Cannot modify conditions for a completed consultation');
    }

    const patientId = consultation.rows[0].patient_id;

    // Check for duplicate condition name
    const existing = await pool.query(
      `SELECT id FROM chronic_conditions WHERE patient_id = $1 AND condition_name ILIKE $2`,
      [patientId, condition_name]
    );

    if (existing.rowCount > 0) {
      return errorResponse(res, 409, 'CONFLICT', 'This chronic condition already exists for this patient');
    }

    const inserted = await pool.query(
      `INSERT INTO chronic_conditions (patient_id, condition_name, status, diagnosed_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, patient_id, condition_name, status, diagnosed_date`,
      [patientId, condition_name, status.toLowerCase(), diagnosed_date || null]
    );

    return successResponse(res, 201, inserted.rows[0], 'Chronic condition added successfully.');
  } catch (error) {
    return next(error);
  }
}

async function updatePatientCondition(req, res, next) {
  try {
    const { consultationId, conditionId } = req.params;
    const { condition_name, status, diagnosed_date } = req.body;

    if (!isUuid(consultationId) || !isUuid(conditionId)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'IDs must be valid UUIDs');
    }

    if (!condition_name && !status && diagnosed_date === undefined) {
      return errorResponse(res, 400, 'BAD_REQUEST', 'At least one field must be provided for update');
    }

    if (status) {
      const validStatus = ['active', 'managed', 'resolved'];
      if (!validStatus.includes(status.toLowerCase())) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'status must be one of: active, managed, resolved');
      }
    }

    const doctorId = req.doctor?.id;
    if (!doctorId) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Doctor verification context missing');
    }

    const consultation = await pool.query(
      `SELECT id, patient_id, status FROM consultations
       WHERE id = $1 AND doctor_id = $2`,
      [consultationId, doctorId]
    );

    if (consultation.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Consultation not found');
    }

    if (consultation.rows[0].status === 'completed') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Cannot modify conditions for a completed consultation');
    }

    const patientId = consultation.rows[0].patient_id;

    const existing = await pool.query(
      `SELECT condition_name, status, diagnosed_date FROM chronic_conditions
       WHERE id = $1 AND patient_id = $2`,
      [conditionId, patientId]
    );

    if (existing.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Chronic condition not found');
    }

    const finalName = condition_name || existing.rows[0].condition_name;
    const finalStatus = status ? status.toLowerCase() : existing.rows[0].status;
    const finalDate = diagnosed_date !== undefined ? diagnosed_date : existing.rows[0].diagnosed_date;

    const updated = await pool.query(
      `UPDATE chronic_conditions
       SET condition_name = $1, status = $2, diagnosed_date = $3
       WHERE id = $4
       RETURNING id, patient_id, condition_name, status, diagnosed_date`,
      [finalName, finalStatus, finalDate, conditionId]
    );

    return successResponse(res, 200, updated.rows[0], 'Chronic condition updated successfully.');
  } catch (error) {
    return next(error);
  }
}

async function deletePatientCondition(req, res, next) {
  try {
    const { consultationId, conditionId } = req.params;

    if (!isUuid(consultationId) || !isUuid(conditionId)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'IDs must be valid UUIDs');
    }

    const doctorId = req.doctor?.id;
    if (!doctorId) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Doctor verification context missing');
    }

    const consultation = await pool.query(
      `SELECT id, patient_id, status FROM consultations
       WHERE id = $1 AND doctor_id = $2`,
      [consultationId, doctorId]
    );

    if (consultation.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Consultation not found');
    }

    if (consultation.rows[0].status === 'completed') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Cannot modify conditions for a completed consultation');
    }

    const patientId = consultation.rows[0].patient_id;

    const deleted = await pool.query(
      `DELETE FROM chronic_conditions
       WHERE id = $1 AND patient_id = $2
       RETURNING id`,
      [conditionId, patientId]
    );

    if (deleted.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Chronic condition not found');
    }

    return successResponse(res, 200, { id: deleted.rows[0].id }, 'Chronic condition deleted successfully.');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPatientCondition,
  updatePatientCondition,
  deletePatientCondition,
};
