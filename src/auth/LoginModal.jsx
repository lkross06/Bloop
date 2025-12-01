//Triggering popup + login logic when users clicks on button
import React from "react";
import "./loginModal.css";

export default function LoginModal({open, onClose, onLogin})
{
    if (!open) 
        return null;
    return(
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Log In</h2>
                <button className="modal-button" onClick={onLogin}>
                    Continue with Google
                </button>
                <button className="close-button" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}