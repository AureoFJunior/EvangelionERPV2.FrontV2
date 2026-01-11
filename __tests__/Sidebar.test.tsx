import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Sidebar } from '../components/Sidebar';
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

describe('Sidebar', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      logout: jest.fn(),
    });
    mockedUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: jest.fn(),
      colors: mockColors,
    });
    mockedUseResponsive.mockReturnValue({
      isCompact: false,
    });
  });

  it('selects modules via navigation buttons', () => {
    const setActiveModule = jest.fn();
    const { getByTestId } = render(
      <Sidebar activeModule="dashboard" setActiveModule={setActiveModule} layout="side" />
    );

    fireEvent.press(getByTestId('sidebar-nav-products'));

    expect(setActiveModule).toHaveBeenCalledWith('products');
  });

  it('calls logout when requested', () => {
    const logout = jest.fn();
    mockedUseAuth.mockReturnValue({
      logout,
    });

    const { getByTestId } = render(
      <Sidebar activeModule="dashboard" setActiveModule={jest.fn()} layout="side" />
    );

    fireEvent.press(getByTestId('sidebar-logout'));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
