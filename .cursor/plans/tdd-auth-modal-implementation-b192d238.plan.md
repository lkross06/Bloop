<!-- b192d238-99b5-41e1-86ad-49be7cb54cb9 2bf573e7-098e-4070-a587-37f0b364e1b0 -->
# TDD Implementation Plan: Auth Modal for '+' Button

## Overview

Implement a sign-up modal that appears when non-authenticated users click the '+' button, using Test-Driven Development with Vitest and React Testing Library.

## Architecture

### Component Structure

- **App.jsx**: Main component that handles '+' button click and auth state
- **LoginModal.jsx**: Modal component for sign-up/sign-in (to be implemented)
- **useAuthState.js**: Custom hook for managing Firebase auth state (exists, may need enhancement)
- **AuthGuard**: Logic to check auth state before showing location form

### Class Diagram

```
┌─────────────────┐
│      App        │
│─────────────────│
│ +trigger        │
│ +setTrigger()   │
│─────────────────│
│ +handlePlusClick()│
│ +checkAuthState()│
└────────┬────────┘
         │
         │ uses
         ▼
┌─────────────────┐      ┌──────────────────┐
│  useAuthState   │      │   LoginModal     │
│  (Custom Hook)  │      │──────────────────│
│─────────────────│      │ +isOpen           │
│ +user            │      │ +onClose()       │
│ +loading        │      │ +onSignUp()      │
│ +error          │      │──────────────────│
│ +watchUser()    │      │ +render()        │
└─────────────────┘      └────────┬─────────┘
                                   │
                                   │ uses
                                   ▼
                          ┌──────────────────┐
                          │  useAuthState    │
                          │  (auth functions)│
                          │──────────────────│
                          │ +loginWithGoogle()│
                          │ +registerWithEmail()│
                          │ +loginWithEmail()│
                          └──────────────────┘
```

## Implementation Steps (TDD Approach)

### Phase 1: Test Setup

1. Install Vitest, React Testing Library, and related dependencies
2. Configure Vitest in `vite.config.js`
3. Create test utilities for mocking Firebase auth

### Phase 2: Write Tests First (Red Phase)

1. **Test: Auth State Hook**

   - Test `useAuthState` returns null user when logged out
   - Test `useAuthState` returns user object when logged in
   - Test loading state during auth check

2. **Test: LoginModal Component**

   - Test modal renders when `isOpen={true}`
   - Test modal doesn't render when `isOpen={false}`
   - Test sign-up form fields are present
   - Test Google sign-up button exists
   - Test email/password sign-up form exists
   - Test modal closes when close button clicked

3. **Test: App Component '+' Button Behavior**

   - Test clicking '+' when logged out opens LoginModal
   - Test clicking '+' when logged in opens LocationCreateForm
   - Test LoginModal closes after successful sign-up
   - Test LocationCreateForm opens after successful authentication

### Phase 3: Implement Features (Green Phase)

1. **Enhance useAuthState Hook**

   - Create or update hook to return `{ user, loading, error }`
   - Integrate with `watchUser` from Firebase

2. **Implement LoginModal Component**

   - Create modal UI with sign-up options
   - Integrate with `registerWithEmail` and `loginWithGoogle`
   - Handle successful authentication and close modal
   - Call `ensureUserDoc` after sign-up

3. **Update App.jsx**

   - Replace hardcoded `login` variable with `useAuthState` hook
   - Modify '+' button onClick to check auth state
   - Show LoginModal if not authenticated
   - Show LocationCreateForm if authenticated

### Phase 4: Refactor (Refactor Phase)

1. Extract auth check logic into reusable function
2. Clean up any test duplication
3. Ensure proper error handling

## Files to Modify/Create

### New Files

- `src/auth/useAuthStateHook.js` (if creating new hook, or enhance existing)
- `src/__tests__/App.test.jsx`
- `src/__tests__/LoginModal.test.jsx`
- `src/__tests__/useAuthState.test.js`
- `src/__tests__/setup.js` (for test configuration)
- `vitest.config.js` (or update `vite.config.js`)

### Modified Files

- `src/App.jsx` - Update '+' button handler and auth state
- `src/auth/LoginModal.jsx` - Implement modal component
- `src/auth/useAuthState.js` - Enhance to return React hook
- `vite.config.js` - Add Vitest configuration
- `package.json` - Add test dependencies

## Test Structure Example

```javascript
// App.test.jsx
describe('App Component', () => {
  it('shows LoginModal when + button clicked and user not logged in', () => {})
  it('shows LocationCreateForm when + button clicked and user logged in', () => {})
})

// LoginModal.test.jsx
describe('LoginModal Component', () => {
  it('renders when isOpen is true', () => {})
  it('calls onClose when close button clicked', () => {})
  it('shows sign-up form fields', () => {})
})
```

## Dependencies to Install

- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jsdom` (for DOM simulation in tests)

### To-dos

- [ ] Create LoginModal component with sign up/sign in functionality, Google auth, and email/password support
- [ ] Add authentication state management to App.jsx using watchUser hook and replace hardcoded login variable
- [ ] Modify '+' button onClick handler to check auth state and show LoginModal for unauthenticated users
- [ ] Replace all hardcoded login variable checks with auth state checks throughout App.jsx