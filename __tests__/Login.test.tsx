import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Login } from '../components/Login';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { mockColors } from './test-utils';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../hooks/useResponsive', () => ({
  useResponsive: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseTheme = useTheme as jest.Mock;
const mockedUseResponsive = useResponsive as jest.Mock;

describe('Login', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      loginWithGoogleCode: jest.fn(),
    });
    mockedUseTheme.mockReturnValue({
      theme: 'dark',
      colors: mockColors,
    });
    mockedUseResponsive.mockReturnValue({
      isCompact: false,
    });
  });

  it('does not submit without credentials', () => {
    const login = jest.fn();
    mockedUseAuth.mockReturnValue({
      login,
      loginWithGoogle: jest.fn(),
      loginWithGoogleCode: jest.fn(),
    });

    const { getByTestId } = render(<Login />);

    fireEvent.press(getByTestId('login-submit'));

    expect(login).not.toHaveBeenCalled();
  });

  it('submits credentials and handles failures', async () => {
    const login = jest.fn().mockRejectedValueOnce(new Error('Invalid credentials'));
    mockedUseAuth.mockReturnValue({
      login,
      loginWithGoogle: jest.fn(),
      loginWithGoogleCode: jest.fn(),
    });

    const { getByTestId, queryByTestId } = render(<Login />);

    fireEvent.changeText(getByTestId('login-username'), 'shinji');
    fireEvent.changeText(getByTestId('login-password'), 'unit-01');
    fireEvent.press(getByTestId('login-submit'));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ username: 'shinji', password: 'unit-01' });
      expect(queryByTestId('login-error')).toBeTruthy();
    });
  });
});
