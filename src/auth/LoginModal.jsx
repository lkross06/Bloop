//Triggering popup + login logic when users clicks on button

import { useState, useEffect } from 'react';
import { useAuthState } from './useAuthState';
import './loginModal.css';

export default function LoginModal({ isOpen, onClose, onGoogleLogin, onEmailSignUp }) {
  // ALL HOOKS MUST BE CALLED FIRST (before any returns)
  
  // Get the current auth state
  const { user, loading } = useAuthState();

  // Form state for email and password - MOVED UP HERE
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  // Handle form submission (for now, just prevent default)
  const handleSubmit = (e) => {
    e.preventDefault();
    if(!onEmailSignUp)
        return;
    onEmailSignUp(email,password);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Sign Up</h2>
        
        {/* Google Login Button */}
        
          <button className="modal-button" onClick={onGoogleLogin}>
            Continue with Google
          </button>
        

        {/* Email/Password Form */}
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
          <button type="submit" className="modal-button">Sign Up</button>
        </form>

        {/* Close button */}
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
