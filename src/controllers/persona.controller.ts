// Import necessary modules
import { Request, Response } from 'express';
import Persona from '../models/persona.model';

// Function to delete a persona
export const deletePersona = async (req: Request, res: Response) => {
    const { personaId } = req.body;
    try {
        const result = await Persona.deleteOne({ personaId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Persona not found.' });
        }
        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
