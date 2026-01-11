import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { mockColors } from './test-utils';

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = useTheme as jest.Mock;

describe('ThemeToggle', () => {
  it('calls toggleTheme when pressed', () => {
    const toggleTheme = jest.fn();
    mockedUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme,
      colors: mockColors,
    });

    const { getByTestId, getByText } = render(<ThemeToggle />);

    expect(getByText('Theme')).toBeTruthy();
    fireEvent.press(getByTestId('theme-toggle'));

    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });
});
