const express = require('express');

const { authenticate } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const patientController = require('../controllers/patientController');

const router = express.Router();

router.get('/', requireRole('patient'), patientController.getOwnProfile);
router.post('/', requireRole('patient'), patientController.createPatientProfile);

router.put('/', requireRole('patient'), patientController.updateOwnProfile);
router.get('/consultations', requireRole('patient'), patientController.getOwnConsultations);

router.post('/grant-access', requireRole('patient'), patientController.grantDoctorAccess);
router.delete('/revoke-access/:doctorId', requireRole('patient'), patientController.revokeDoctorAccess);

router.get('/access-list', requireRole('patient'), patientController.getAccessList);
router.get('/:id', patientController.getPatientById);

module.exports = router;
