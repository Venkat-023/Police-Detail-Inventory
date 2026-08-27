import React from 'react';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const AdminDashboard = () => {
    const [showDialog, setShowDialog] = React.useState(false);

    const handleDeletePersona = async () => {
        const response = await fetch('/api/v1/personas/ng-super-detail-admin', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personaId: 'ng-super-detail-admin' })
        });
        if (response.status === 204) {
            // Handle successful deletion
        }
    };

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <button onClick={() => setShowDialog(true)}>Delete Persona</button>
            {showDialog && (
                <ConfirmationDialog 
                    onConfirm={() => { handleDeletePersona(); setShowDialog(false); }} 
                    onCancel={() => setShowDialog(false)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;