import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

type ToastVariant = 'error' | 'success' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  opacity: Animated.Value;
  translateY: Animated.Value;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

const TOAST_DURATION = 4000;
const ANIM_IN = 280;
const ANIM_OUT = 220;
const MAX_VISIBLE = 4;

const variantIcons: Record<ToastVariant, string> = {
  error: 'alert-circle',
  success: 'check-circle',
  warning: 'alert-triangle',
  info: 'info',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (!toast) return prev;

      Animated.parallel([
        Animated.timing(toast.opacity, {
          toValue: 0,
          duration: ANIM_OUT,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(toast.translateY, {
          toValue: -20,
          duration: ANIM_OUT,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToasts((curr) => curr.filter((t) => t.id !== id));
      });

      const timer = timersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }

      return prev;
    });
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'error') => {
      const id = ++idRef.current;
      const opacity = new Animated.Value(0);
      const translateY = new Animated.Value(-30);

      const toast: Toast = { id, message, variant, opacity, translateY };

      setToasts((prev) => {
        const next = [...prev, toast];
        if (next.length > MAX_VISIBLE) {
          const oldest = next[0];
          dismissToast(oldest.id);
        }
        return next;
      });

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIM_IN,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIM_IN,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismissToast(id);
        timersRef.current.delete(id);
      }, TOAST_DURATION);

      timersRef.current.set(id, timer);
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast, index) => {
          const accent = {
            error: colors.destructive,
            success: colors.neonGreen,
            warning: colors.accentOrange,
            info: colors.primaryPurple,
          }[toast.variant];
          const config = {
            icon: variantIcons[toast.variant],
            accent,
            bg: `${accent}14`,
            border: `${accent}40`,
          };
          return (
            <Animated.View
              key={toast.id}
              style={[
                styles.toast,
                {
                  backgroundColor: colors.cardBgFrom,
                  borderColor: config.border,
                  opacity: toast.opacity,
                  transform: [{ translateY: toast.translateY }],
                },
                index > 0 && { marginTop: 8 },
                Platform.select({
                  web: { boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)' } as any,
                  default: { elevation: 12 },
                }),
              ]}
            >
              <View style={[styles.accentBar, { backgroundColor: config.accent }]} />
              <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
                <Feather name={config.icon as any} size={16} color={config.accent} />
              </View>
              <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={3}>
                {toast.message}
              </Text>
              <Pressable
                onPress={() => dismissToast(toast.id)}
                style={(state: any) => [
                  styles.dismissBtn,
                  state.hovered && { backgroundColor: 'rgba(255,255,255,0.08)' },
                ]}
                hitSlop={8}
              >
                <Feather name="x" size={14} color={colors.textMuted} />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 52,
    right: 20,
    zIndex: 9999,
    alignItems: 'flex-end',
    maxWidth: 420,
    ...Platform.select({ web: { pointerEvents: 'box-none' } as any, default: {} }),
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingRight: 10,
    paddingLeft: 0,
    gap: 10,
    minWidth: 280,
    maxWidth: 420,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transition: 'border-color 0.2s ease',
      } as any,
      default: {},
    }),
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
