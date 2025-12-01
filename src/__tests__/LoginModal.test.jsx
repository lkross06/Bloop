import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LoginModal from '../auth/LoginModal';
import { useAuthState } from '../auth/useAuthState';

// Mock useAuthState so we can control auth state
vi.mock('../auth/useAuthState', () => ({
  useAuthState: vi.fn(),
}));

const mockUseAuthState = useAuthState;

describe('LoginModal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthState.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <LoginModal isOpen={false} onClose={mockOnClose} />
    );

    // Component should return null (nothing rendered)
    expect(container.firstChild).toBeNull();
  });

  it('renders login UI when open and user is logged out', () => {
    mockUseAuthState.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    });

    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    // Check the heading
    expect(
      screen.getByRole('heading', { name: /sign up/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    const signUpButton = screen.getByRole('button', {
      name: /sign up|register|create account/i,
    });
    expect(signUpButton).toBeInTheDocument();
  });

  it('close button triggers onClose when clicked', async () => {
    const user = userEvent.setup();
    mockUseAuthState.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    });

    render(<LoginModal isOpen={true} onClose={mockOnClose} />);

    // Assuming your close button has text "Close" or aria-label="Close"
    const closeButton = screen.getByRole('button', { name: /close/i });

    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes when user becomes logged in', async () => {
    mockUseAuthState.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    });

    const { rerender } = render(
      <LoginModal isOpen={true} onClose={mockOnClose} />
    );

    expect(
      screen.getByRole('heading', { name: /sign up/i })
    ).toBeInTheDocument();

    // Now simulate user logging in
    mockUseAuthState.mockReturnValue({
      user: { uid: '123', email: 'test@example.com' },
      loading: false,
      error: null,
    });

    rerender(<LoginModal isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});