import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/components/auth/AuthContext';
import { createClient } from '@/utils/supabase/client';
import '@testing-library/jest-dom';

// Mock du client Supabase
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockRefreshSession = jest.fn();
const mockOnAuthStateChange = jest.fn(() => ({
  data: { subscription: { unsubscribe: jest.fn() } }
}));
const mockGetSession = jest.fn(() => Promise.resolve({ data: { session: null } }));

const mockSupabase = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
    signUp: mockSignUp,
    signOut: mockSignOut,
    refreshSession: mockRefreshSession,
    onAuthStateChange: mockOnAuthStateChange,
    getSession: mockGetSession,
  },
  from: jest.fn(() => ({
    insert: jest.fn().mockResolvedValue({ data: null, error: null })
  }))
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

// Mock des composants Next
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock du userService et repository
jest.mock('@/lib/services/user.service', () => ({
  userService: {
    getUserProfile: jest.fn().mockResolvedValue({ id: '123', name: 'Test User' }),
  }
}));

jest.mock('@/lib/data', () => ({
  organizationRepository: {
    getById: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'org-123' })
  }
}));

const TestComponent = () => {
  const { login, register, logout } = useAuth();
  
  return (
    <div>
      <button onClick={() => login('test@test.com', 'password123')} data-testid="btn-login">Login</button>
      <button onClick={() => login('test@test.com', 'wrong')} data-testid="btn-login-fail">Login Fail</button>
      <button onClick={() => register('Test', 'test@test.com', 'password123', undefined, 'client')} data-testid="btn-register">Register</button>
      <button onClick={() => register('Test', 'exist@test.com', 'password123', undefined, 'client')} data-testid="btn-register-fail">Register Fail</button>
      <button onClick={() => logout()} data-testid="btn-logout">Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signIn avec succès', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ data: { user: { id: '123' } }, error: null });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-login'));
    });
    
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' });
  });

  it('signIn avec erreur (mauvais mot de passe)', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid credentials' } });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-login-fail'));
    });
    
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'test@test.com', password: 'wrong' });
  });

  it('signUp avec succès', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: { id: '123' } }, error: null });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-register'));
    });
    
    expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@test.com',
      password: 'password123'
    }));
  });

  it('signUp en échec (email existant)', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: null }, error: { message: 'User already registered' } });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-register-fail'));
    });
    
    expect(mockSignUp).toHaveBeenCalled();
  });

  it('signOut suppression de la session', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-logout'));
    });
    
    expect(mockSignOut).toHaveBeenCalled();
  });
});
