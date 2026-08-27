import express from 'express';
import { deletePersona } from '../controllers/persona.controller';

const router = express.Router();

// DELETE endpoint to remove a persona
router.delete('/api/v1/personas/ng-super-detail-admin', deletePersona);

export default router;