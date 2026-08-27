import React from 'react';

const ConfirmationDialog = ({ onConfirm, onCancel }) => {
    return (
        <div className="confirmation-dialog">
            <p>Are you sure you want to delete the 'ng super detail admin' persona?</p>
            <button onClick={onConfirm}>Yes</button>
            <button onClick={onCancel}>No</button>
        </div>
    );
};

export default ConfirmationDialog;