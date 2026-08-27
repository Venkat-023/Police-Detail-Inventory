import React from 'react';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const AdminDashboard = () => {
    const [isDialogOpen, setDialogOpen] = React.useState(false);

    const handleDelete = async () => {
        const response = await fetch('/api/v1/personas/ng-super-detail-admin', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: 'ng-super-detail-admin' }) });
        if (response.status === 204) {
            // Handle successful deletion
        } else {
            // Handle error
        }
    };

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <button onClick={() => setDialogOpen(true)}>Delete Persona</button>
            {isDialogOpen && <ConfirmationDialog onConfirm={handleDelete} onCancel={() => setDialogOpen(false)} />}
        </div>
    );
};

export default AdminDashboard;