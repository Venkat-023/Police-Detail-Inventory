import { Request, Response } from 'express';
import Persona from '../models/persona.model';

export const deletePersona = async (req: Request, res: Response) => {
    const { personaId } = req.body;
    try {
        const result = await Persona.deleteOne({ personaId });
        if (result.deletedCount === 0) {
            return res.status(404).send('Persona not found.');
        }
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal server error.');
    }
};