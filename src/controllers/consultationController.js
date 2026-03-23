const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { isUuid } = require('../utils/validators');

const CONSULTATION_STATUSES = new Set(['in_progress', 'completed', 'cancelled']);

async function startConsultation(req, res, next) {
  try {
    const { patient_id } = req.body || {};

    if (!patient_id) {
      return errorResponse(res, 400, 'BAD_REQUEST', 'Missing required field: patient_id');
    }

    if (!isUuid(patient_id)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'patient_id must be a valid UUID');
    }

    const doctorId = req.doctor?.id;
    if (!doctorId) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Doctor verification context missing');
    }

    const access = await pool.query(
      `select id, status, expires_at
       from access_permissions
       where patient_id = $1 and doctor_id = $2
         and status = 'ACTIVE'
         and (expires_at is null or expires_at > now())
       order by created_at desc
       limit 1`,
      [patient_id, doctorId]
    );

    if (access.rowCount === 0) {
      return errorResponse(res, 403, 'FORBIDDEN', 'No active access permission for this patient');
    }

    const inserted = await pool.query(
      `insert into consultations (patient_id, doctor_id, status)
       values ($1, $2, 'in_progress')
       returning id, patient_id, doctor_id, status, created_at`,
      [patient_id, doctorId]
    );

    return successResponse(res, 201, inserted.rows[0], 'Consultation created.');
  } catch (err) {
    return next(err);
  }
}

async function getConsultationById(req, res, next) {
  try {
    const { consultationId } = req.params;

    if (!isUuid(consultationId)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'consultationId must be a valid UUID');
    }

    const doctorId = req.doctor?.id;
    if (!doctorId) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Doctor verification context missing');
    }

    const q = await pool.query(
      `select c.*
       from consultations c
       where c.id = $1 and c.doctor_id = $2`,
      [consultationId, doctorId]
    );

    if (q.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Consultation not found');
    }

    return successResponse(res, 200, q.rows[0], 'Operation successful.');
  } catch (err) {
    return next(err);
  }
}

async function updateConsultationStatus(req, res, next) {
  try {
    const { consultationId } = req.params;
    const { status } = req.body || {};

    if (!isUuid(consultationId)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'consultationId must be a valid UUID');
    }

    if (!status) {
      return errorResponse(res, 400, 'BAD_REQUEST', 'Missing required field: status');
    }

    if (!CONSULTATION_STATUSES.has(status)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', "status must be one of ['in_progress','completed','cancelled']");
    }

    const doctorId = req.doctor?.id;
    if (!doctorId) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Doctor verification context missing');
    }

    const updated = await pool.query(
      `update consultations
       set status = $1, updated_at = now()
       where id = $2 and doctor_id = $3
       returning id, patient_id, doctor_id, status, updated_at`,
      [status, consultationId, doctorId]
    );

    if (updated.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Consultation not found');
    }

    return successResponse(res, 200, updated.rows[0], 'Operation successful.');
  } catch (err) {
    return next(err);
  }
}

async function upsertPrescription(req, res, next) {
  try {
    const { consultationId } = req.params;

    if (!isUuid(consultationId)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'consultationId must be a valid UUID');
    }

    const doctorId = req.doctor?.id;
    if (!doctorId) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Doctor verification context missing');
    }

    const consultation = await pool.query(
      `select id, status
       from consultations
       where id = $1 and doctor_id = $2`,
      [consultationId, doctorId]
    );

    if (consultation.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Consultation not found');
    }

    if (consultation.rows[0].status === 'completed') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Consultation is completed; prescription can no longer be changed');
    }

    if (consultation.rows[0].status === 'cancelled') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Consultation is cancelled; prescription can no longer be changed');
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return errorResponse(res, 400, 'BAD_REQUEST', 'Missing prescription payload');
    }

    const upserted = await pool.query(
      `insert into prescriptions (consultation_id, payload)
       values ($1, $2)
       on conflict (consultation_id)
       do update set payload = excluded.payload, updated_at = now()
       returning id, consultation_id, payload, created_at, updated_at`,
      [consultationId, payload]
    );

    return successResponse(res, 200, upserted.rows[0], 'Operation successful.');
  } catch (err) {
    return next(err);
  }
}

async function getPrescription(req, res, next) {
  try {
    const { consultationId } = req.params;

    if (!isUuid(consultationId)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'consultationId must be a valid UUID');
    }

    const doctorId = req.doctor?.id;
    if (!doctorId) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Doctor verification context missing');
    }

    const consultation = await pool.query(
      `select id
       from consultations
       where id = $1 and doctor_id = $2`,
      [consultationId, doctorId]
    );

    if (consultation.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Consultation not found');
    }

    const q = await pool.query(
      `select id, consultation_id, payload, created_at, updated_at
       from prescriptions
       where consultation_id = $1`,
      [consultationId]
    );

    if (q.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Prescription not found');
    }

    return successResponse(res, 200, q.rows[0], 'Operation successful.');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  startConsultation,
  getConsultationById,
  updateConsultationStatus,
  upsertPrescription,
  getPrescription,
};
