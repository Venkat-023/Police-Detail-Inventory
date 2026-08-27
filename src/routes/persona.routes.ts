import { Router } from 'express';
import { deletePersona } from '../controllers/persona.controller';

const router = Router();

// DELETE endpoint for persona deletion
router.delete('/api/v1/personas/ng-super-detail-admin', deletePersona);

export default router;