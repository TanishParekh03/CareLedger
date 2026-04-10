const pool = require('../config/db');
const sendMail = require('../services/emailService');
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

async function searchVerifiedDoctors(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const limitRaw = Number(req.query.limit || 8);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 8;

    if (!q) {
      return successResponse(res, 200, [], 'Operation successful.');
    }

    const result = await pool.query(
      `SELECT d.id, d.full_name, d.specialization, d.license_number
       FROM doctors d
       WHERE d.is_verified = true
         AND (
           d.full_name ILIKE $1
           OR d.specialization ILIKE $1
           OR d.license_number ILIKE $1
         )
       ORDER BY d.full_name ASC
       LIMIT $2`,
      [`%${q}%`, limit]
    );

    return successResponse(res, 200, result.rows, 'Operation successful.');
  } catch (err) {
    return next(err);
  }
}

async function searchPatientsForConsultation(req, res, next) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'doctor') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Only doctors can access this endpoint');
    }

    let doctorId = req.doctor?.id;
    if (!doctorId) {
      const doctorProfile = await pool.query(
        `SELECT id FROM doctors WHERE user_id = $1 LIMIT 1`,
        [userId]
      );

      if (doctorProfile.rowCount === 0) {
        return errorResponse(res, 404, 'NOT_FOUND', 'Doctor profile not found. Please create your profile first.');
      }

      doctorId = doctorProfile.rows[0].id;
    }

    const q = String(req.query.q || '').trim();
    const limitRaw = Number(req.query.limit || 10);
    let limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 25) : 10;

    if (!q) {
      // If no query, return the doctor's active accessible patients
      const activePatients = await pool.query(
        `SELECT
           p.id,
           p.full_name,
           p.health_id::text AS health_id,
           p.date_of_birth,
           p.gender,
           p.blood_group,
           'active' AS access_status,
           ap.expires_at AS access_expires_at,
           ac.id AS active_consultation_id,
           ac.consultation_date AS active_consultation_date
         FROM access_permissions ap
         JOIN patients p ON p.id = ap.patient_id
         LEFT JOIN LATERAL (
           SELECT c.id, c.consultation_date
           FROM consultations c
           WHERE c.patient_id = p.id
             AND c.doctor_id = $1
             AND LOWER(c.status::text) = 'in_progress'
           ORDER BY c.consultation_date DESC
           LIMIT 1
         ) ac ON true
         WHERE ap.doctor_id = $1
           AND ap.status = 'active'
           AND (ap.expires_at IS NULL OR ap.expires_at > NOW())
         ORDER BY p.full_name ASC
         LIMIT $2`,
        [doctorId, limit]
      );
      
      const rows = activePatients.rows.map(row => ({
         ...row,
         has_active_access: true,
      }));
      return successResponse(res, 200, rows, 'Operation successful.');
    }

    const normalizedQuery = q.toLowerCase().replace(/[^a-z0-9]/g, '');

    const result = await pool.query(
      `SELECT
         p.id,
         p.full_name,
        p.health_id::text AS health_id,
         p.date_of_birth,
         p.gender,
         p.blood_group,
         ap.status AS access_status,
         ap.expires_at AS access_expires_at,
         ac.id AS active_consultation_id,
         ac.consultation_date AS active_consultation_date
       FROM patients p
       LEFT JOIN LATERAL (
         SELECT a.status, a.expires_at
         FROM access_permissions a
         WHERE a.patient_id = p.id AND a.doctor_id = $1
         ORDER BY a.created_at DESC
         LIMIT 1
       ) ap ON true
       LEFT JOIN LATERAL (
         SELECT c.id, c.consultation_date
         FROM consultations c
         WHERE c.patient_id = p.id
           AND c.doctor_id = $1
           AND LOWER(c.status::text) = 'in_progress'
         ORDER BY c.consultation_date DESC
         LIMIT 1
       ) ac ON true
       WHERE
         p.full_name ILIKE $2
         OR p.health_id::text ILIKE $2
         OR REGEXP_REPLACE(LOWER(COALESCE(p.health_id::text, '')), '[^a-z0-9]', '', 'g') = $3
       ORDER BY
         CASE
           WHEN REGEXP_REPLACE(LOWER(COALESCE(p.health_id::text, '')), '[^a-z0-9]', '', 'g') = $3 THEN 0
           WHEN LOWER(COALESCE(p.full_name, '')) = LOWER($4) THEN 1
           ELSE 2
         END,
         p.full_name ASC
       LIMIT $5`,
      [doctorId, `%${q}%`, normalizedQuery, q, limit]
    );

    const now = Date.now();
    const rows = result.rows.map((row) => {
      const normalizedStatus = row.access_status ? String(row.access_status).toLowerCase() : null;
      const hasNotExpired = !row.access_expires_at || new Date(row.access_expires_at).getTime() > now;
      const hasActiveAccess = normalizedStatus === 'active' && hasNotExpired;

      return {
        ...row,
        has_active_access: hasActiveAccess,
      };
    });

    return successResponse(res, 200, rows, 'Operation successful.');
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
         c.id, c.patient_id, c.consultation_date, c.status, c.updated_at,
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


const getPatientDataDuringEmergency = async (req , res , next) => {
  try {
    const doctorId = req.doctor?.id;

    if (!doctorId) {
      return errorResponse(res, 403, 'FORBIDDEN', 'Doctor verification context missing');
    }

    const patientId = req.params.patientId;
    const clinicId = req.params.clinicId;
    const getPatientData = await pool.query(
      `select p.full_name as "patient-name", p.gender as gender, p.blood_group as blood_group, age(p.date_of_birth) as age,
    (
        select coalesce(json_agg(json_build_object(
            'allergy', a.allergen,
            'severity', a.severity
        )), '[]')
        from allergies a
        where a.patient_id = p.id
    ) as allergies,
    (
        select coalesce(json_agg(json_build_object(
            'condition-name', c.condition_name,
            'status', c.status,
            'diagnosed-date', c.diagnosed_date
        )), '[]')
        from chronic_conditions c
        where c.patient_id = p.id
    ) as "chronic-illness",
    (
        select coalesce(json_agg(json_build_object(
            'medicine-name', m.name,
            'dosage', m.dosage,
        'prescribed-for', m.prescibed_for,
            'prescribed_by', (select d.full_name from doctors d where d.id = m.prescribed_by),
        'date', m.prescibed_at
        )), '[]')
        from active_medication m
      where m.user_id = p.user_id
    ) as "active-medications"

from patients p
where p.id = $1;` , [patientId]
    )

    const getEmergencyContact = await pool.query(
      `select d.full_name as "doctor-name" , c.address as "doctor-address" ,u.phone as "doctor-contact-number" , c.clinic_name as "doctor-clinic-name" ,
       e.contact_email as "patient-emergency-email" , e.contact_name as "patient-emergency-name" , p.full_name as "patient-name" 
       from doctors d
       left join users u on u.id = d.user_id
       left join clinics c on c.doctor_id = d.id and c.id = $2
       left join emergency_info e on e.patient_id = $3
       left join patients p on p.id = $3
       where d.id = $1`,[doctorId , clinicId , patientId]
    )
    const len = getEmergencyContact.rowCount;
    for(let i = 0 ; i < len ; i++ ){
      const data = getEmergencyContact.rows[i];
      await sendMail(data);
    }
    return successResponse(res, 200, getPatientData.rows, 'Operation successful.');

  } catch (error) {
    return next(error)
  }
}

module.exports = {
  createDoctorProfile,
  getOwnProfile,
  getDoctorById,
  searchVerifiedDoctors,
  searchPatientsForConsultation,
  updateOwnProfile,
  getOwnConsultations,
  getPatientDataDuringEmergency
};
