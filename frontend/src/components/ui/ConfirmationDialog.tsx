import React from 'react';

const ConfirmationDialog = ({ isOpen, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className='confirmation-dialog'>
            <p>Are you sure you want to delete this persona?</p>
            <button onClick={onConfirm}>Confirm</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    );
};

export default ConfirmationDialog;