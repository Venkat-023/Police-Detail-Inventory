export const deletePersona = async (personaId) => {
    const response = await fetch(`/api/v1/personas/${personaId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personaId })
    });
    if (!response.ok) {
        throw new Error('Failed to delete persona');
    }
};