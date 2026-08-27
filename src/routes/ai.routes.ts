import { Router } from 'express';
import { deletePersona } from '../controllers/persona.controller';

const router = Router();

// DELETE endpoint to remove a persona
router.delete('/personas/ng-super-detail-admin', deletePersona);

export default router;