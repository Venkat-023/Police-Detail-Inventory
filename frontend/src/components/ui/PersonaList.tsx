import React from 'react';
import ConfirmationDialog from './ConfirmationDialog';

const PersonaList = ({ personas, onDelete }) => {
    const [isDialogOpen, setDialogOpen] = React.useState(false);
    const [selectedPersona, setSelectedPersona] = React.useState(null);

    const handleDeleteClick = (persona) => {
        setSelectedPersona(persona);
        setDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        await onDelete(selectedPersona);
        setDialogOpen(false);
    };

    return (
        <div>
            {personas.map(persona => (
                <div key={persona.id}>
                    <span>{persona.name}</span>
                    <button onClick={() => handleDeleteClick(persona)}>Delete</button>
                </div>
            ))}
            {isDialogOpen && <ConfirmationDialog onConfirm={handleConfirmDelete} onCancel={() => setDialogOpen(false)} />}
        </div>
    );
};

export default PersonaList;