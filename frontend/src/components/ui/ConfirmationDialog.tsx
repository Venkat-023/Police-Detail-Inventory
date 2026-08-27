import React from 'react';

const ConfirmationDialog = ({ onConfirm, onCancel }) => {
    return (
        <div>
            <h2>Are you sure you want to delete this persona?</h2>
            <button onClick={onConfirm}>Yes</button>
            <button onClick={onCancel}>No</button>
        </div>
    );
};

export default ConfirmationDialog;