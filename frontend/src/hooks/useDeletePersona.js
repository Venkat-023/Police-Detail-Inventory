import { useCallback } from 'react';
import { deletePersona } from '../services/api';

const useDeletePersona = () => {
    const handleDeletePersona = useCallback(async (persona) => {
        await deletePersona(persona.id);
    }, []);

    return handleDeletePersona;
};

export default useDeletePersona;