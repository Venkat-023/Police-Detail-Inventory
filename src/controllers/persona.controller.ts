import { Request, Response } from 'express';
import Persona from '../models/persona.model';

export const deletePersona = async (req: Request, res: Response) => {
    try {
        const personaId = req.body.personaId;
        const result = await Persona.deleteOne({ personaId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Persona not found.' });
        }
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};