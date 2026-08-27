export const deletePersona = async (personaId) => {
    const response = await fetch(`/api/v1/personas/${personaId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    return response;
};