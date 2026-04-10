const express = require('express');

const { authenticate } = require('../middlewares/authMiddleware');
const { requireRole, requireVerifiedDoctor } = require('../middlewares/roleMiddleware');
const consultationController = require('../controllers/consultationController');
const doctorConditionController = require('../controllers/doctorConditionController');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('doctor'));
router.use(requireVerifiedDoctor);

router.post('/', consultationController.startConsultation);
router.get('/:consultationId', consultationController.getConsultationById);
router.put('/:consultationId/status', consultationController.updateConsultationStatus);
router.post('/:consultationId/prescription', consultationController.upsertPrescription);
router.get('/:consultationId/prescription', consultationController.getPrescription);
router.post('/:consultationId/finalize', consultationController.finalizeConsultation);

// Doctor-side chronic condition management for patient
router.post('/:consultationId/conditions', doctorConditionController.createPatientCondition);
router.put('/:consultationId/conditions/:conditionId', doctorConditionController.updatePatientCondition);
router.delete('/:consultationId/conditions/:conditionId', doctorConditionController.deletePatientCondition);

module.exports = router;
