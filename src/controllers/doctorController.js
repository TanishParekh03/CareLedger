const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const { isUuid } = require('../utils/validators');


async function createDoctorProfile(req, res, next) {
  try {
    const { full_name, license_number, specialization } = req.body;

 
    if (!full_name || !license_number) {
      return errorResponse(res, 400, 'BAD_REQUEST', 'Missing required fields: full_name, license_number');
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'doctor') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Only users with doctor role can create doctor profile');
    }
    const existing = await pool.query(
      `SELECT id FROM doctors WHERE user_id = $1`,
      [userId]
    );

    if (existing.rowCount > 0) {
      return errorResponse(res, 409, 'CONFLICT', 'Doctor profile already exists for this user');
    }

    const duplicateLicense = await pool.query(
      `SELECT id FROM doctors WHERE license_number = $1`,
      [license_number]
    );

    if (duplicateLicense.rowCount > 0) {
      return errorResponse(res, 409, 'CONFLICT', 'License number already registered');
    }

    const inserted = await pool.query(
      `INSERT INTO doctors (user_id, full_name, license_number, specialization)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, full_name, license_number, specialization, is_verified`,
      [userId, full_name, license_number, specialization || null]
    );

    return successResponse(res, 201, inserted.rows[0], 'Doctor profile created successfully. Awaiting admin verification.');
  } catch (err) {
    if (err.code === '23505') {
      return errorResponse(res, 409, 'CONFLICT', 'License number already registered');
    }
    return next(err);
  }
}


async function getOwnProfile(req, res, next) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'doctor') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Only doctors can access this endpoint');
    }

    const doctor = await pool.query(
      `SELECT
         d.id, d.user_id, d.full_name, d.license_number,
         d.specialization, d.is_verified,
         u.email, u.phone
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1`,
      [userId]
    );

    if (doctor.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Doctor profile not found. Please create your profile first.');
    }

    return successResponse(res, 200, doctor.rows[0], 'Operation successful.');
  } catch (err) {
    return next(err);
  }
}

async function getDoctorById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'id must be a valid UUID');
    }

    const doctor = await pool.query(
      `SELECT
         d.id, d.full_name, d.license_number,
         d.specialization, d.is_verified
       FROM doctors d
       WHERE d.id = $1 AND d.is_verified = true`,
      [id]
    );

    if (doctor.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Doctor not found or not verified');
    }

    return successResponse(res, 200, doctor.rows[0], 'Operation successful.');
  } catch (err) {
    return next(err);
  }
}

async function updateOwnProfile(req, res, next) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'doctor') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Only doctors can access this endpoint');
    }

    const { full_name, specialization } = req.body;

  
    if (!full_name && !specialization ) {
      return errorResponse(res, 400, 'BAD_REQUEST', 'At least one field must be provided for update');
    }


    const existing = await pool.query(
      `SELECT full_name, specialization FROM doctors WHERE user_id = $1`,
      [userId]
    );

    if (existing.rowCount === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Doctor profile not found');
    }

    const currentProfile = existing.rows[0];

    const updatedFullName = full_name || currentProfile.full_name;
    const updatedSpecialization = specialization !== undefined ? specialization : currentProfile.specialization;

  
    const updated = await pool.query(
      `UPDATE doctors
       SET full_name = $1, specialization = $2
       WHERE user_id = $3
       RETURNING id, user_id, full_name, license_number, specialization, is_verified`,
      [updatedFullName, updatedSpecialization, userId]
    );

    return successResponse(res, 200, updated.rows[0], 'Profile updated successfully.');
  } catch (err) {
    return next(err);
  }
}

async function getOwnConsultations(req, res, next) {
  try {
    const doctorId = req.doctor?.id;

    if (!doctorId) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Doctor verification context missing');
    }

    const consultations = await pool.query(
      `SELECT
         c.id, c.patient_id, c.consultation_date, c.status,
         p.full_name AS patient_name, p.health_id
       FROM consultations c
       JOIN patients p ON p.id = c.patient_id
       WHERE c.doctor_id = $1
       ORDER BY c.consultation_date DESC`,
      [doctorId]
    );

    return successResponse(res, 200, consultations.rows, 'Operation successful.');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createDoctorProfile,
  getOwnProfile,
  getDoctorById,
  updateOwnProfile,
  getOwnConsultations,
};
