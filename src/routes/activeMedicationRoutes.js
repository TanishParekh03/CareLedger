const express = require('express');

const { authenticate } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const activeMedicationController = require('../controllers/activePrescriptionController');

const router = express.Router();
router.get('/:userId', activeMedicationController.getActiveMedicationByUserId);
router.post('/', authenticate, requireRole('doctor'), activeMedicationController.addActiveMedication);
router.put('/:id', authenticate, requireRole('doctor'), activeMedicationController.updateActiveMedication);
router.delete('/:id', authenticate, requireRole('doctor'), activeMedicationController.deleteActiveMedicationById);
module.exports = router;
