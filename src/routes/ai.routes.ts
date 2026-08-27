import express from 'express';
import { deletePersona } from '../controllers/persona.controller';

const router = express.Router();

// DELETE endpoint for deleting a persona
router.delete('/personas/ng-super-detail-admin', deletePersona);

export default router;
