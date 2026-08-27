// Import necessary modules
import express from 'express';
import { deletePersona } from '../controllers/persona.controller';

const router = express.Router();

// DELETE endpoint for persona deletion
router.delete('/personas/ng-super-detail-admin', deletePersona);

export default router;