import React, { useState } from 'react';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const AdminDashboard = () => {
    const [isDialogOpen, setDialogOpen] = useState(false);

    const handleDeletePersona = () => {
        // Call API to delete persona
        setDialogOpen(false);
    };

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <button onClick={() => setDialogOpen(true)}>Delete Persona</button>
            <ConfirmationDialog 
                isOpen={isDialogOpen} 
                onConfirm={handleDeletePersona} 
                onCancel={() => setDialogOpen(false)} 
            />
        </div>
    );
};

export default AdminDashboard;