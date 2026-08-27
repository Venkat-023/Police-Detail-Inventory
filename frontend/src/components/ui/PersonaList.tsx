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
            <ul>
                {personas.map(persona => (
                    <li key={persona.id}>
                        {persona.name}
                        <button onClick={() => handleDeleteClick(persona)}>Delete</button>
                    </li>
                ))}
            </ul>
            {isDialogOpen && (
                <ConfirmationDialog 
                    onConfirm={handleConfirmDelete} 
                    onCancel={() => setDialogOpen(false)}
                />
            )}
        </div>
    );
};

export default PersonaList;