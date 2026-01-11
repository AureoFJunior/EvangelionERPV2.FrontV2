import '@testing-library/jest-native/extend-expect';
import { act } from 'react-test-renderer';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...props }) => React.createElement(Text, props, name);
  return { Feather: Icon };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  const LinearGradient = ({ children, ...props }) => React.createElement(View, props, children);
  return { LinearGradient };
});

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  const BlurView = ({ children, ...props }) => React.createElement(View, props, children);
  return { BlurView };
});

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  ResponseType: {
    Code: 'code',
    IdToken: 'id_token',
  },
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [null, null, jest.fn()],
}));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});
