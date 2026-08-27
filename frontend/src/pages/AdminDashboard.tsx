import React from 'react';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const AdminDashboard = () => {
    const handleDelete = async () => {
        // Call DELETE API to remove persona
        const response = await fetch('/api/v1/personas/ng-super-detail-admin', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: 'ng-super-detail-admin' }) });
        if (response.status === 204) {
            // Handle successful deletion
        }
    };

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <ConfirmationDialog onConfirm={handleDelete} onCancel={() => {}} />
        </div>
    );
};

export default AdminDashboard;