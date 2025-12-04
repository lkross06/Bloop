import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { useAuthState } from '../auth/useAuthState';
import { ensureUserDoc } from '../auth/ensureUserDoc';

// Mock dependencies
vi.mock('../auth/useAuthState');
vi.mock('../auth/ensureUserDoc');
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));
vi.mock('../firebase.js', () => ({
  auth: {},
  googleProvider: {},
}));

// Mock Google Maps
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: () => <div data-testid="google-map">Map</div>,
  LoadScriptNext: ({ children }) => <div>{children}</div>,
}));

const mockUseAuthState = useAuthState;
const mockEnsureUserDoc = ensureUserDoc;

describe('App Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthState.mockReturnValue({
      user: null,
      loading: false,
    });
  });

  it('calls ensureUserDoc when user logs in via Google', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    const mockFirebaseUser = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User'
    };

    signInWithPopup.mockResolvedValue({
      user: mockFirebaseUser
    });
    mockEnsureUserDoc.mockResolvedValue(undefined);

    // Initially logged out
    mockUseAuthState.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<App />);

    // After login, user should be set
    mockUseAuthState.mockReturnValue({
      user: mockFirebaseUser,
      loading: false,
    });

    // Wait for ensureUserDoc to be called
    await waitFor(() => {
      expect(mockEnsureUserDoc).toHaveBeenCalledWith(mockFirebaseUser);
    });
  });

  it('shows login modal when user is not logged in and clicks + button', async () => {
    mockUseAuthState.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<App />);
    const user = userEvent.setup();

    // Find and click the + button
    const plusButton = screen.getByText('＋');
    await user.click(plusButton);

    // Login modal should be visible
    await waitFor(() => {
      expect(screen.getByText(/sign up/i)).toBeInTheDocument();
    });
  });

  it('does not show login modal when user is logged in', () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com'
    };

    mockUseAuthState.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(<App />);

    // Login modal should not be visible
    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
  });

  it('isLoggedIn is true when user exists', () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com'
    };

    mockUseAuthState.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(<App />);

    // The component should render without login prompts
    expect(screen.queryByText(/login/i)).not.toBeInTheDocument();
  });

  it('isLoggedIn is false when user is null', () => {
    mockUseAuthState.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<App />);

    // Should show login banner or prompt
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });
});