//Triggering popup + login logic when users clicks on button

import { useState, useEffect } from 'react';
import { useAuthState } from './useAuthState';

export default function LoginModal({ isOpen, onClose }) {
  // Get the current auth state
  const { user, loading } = useAuthState();

  // Auto-close if user becomes logged in while modal is open
  useEffect(() => {
    // If user is logged in and modal is open, close it
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  // Don't render anything if modal is not open
  if (!isOpen) {
    return null;
  }

  // Form state for email and password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Handle form submission (for now, just prevent default)
  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement sign-up logic later
  };

  return (
    <div className="login-modal">
      {/* Close button */}
      <button 
        type="button" 
        onClick={onClose}
        aria-label="Close"
      >
        X
      </button>

      {/* Modal content */}
      <div className="login-modal-content">
        <h2>Sign Up</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Email input */}
          <div>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password input */}
          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Sign up button */}
          <button type="submit">Sign Up</button>
        </form>
      </div>
    </div>
  );
}
