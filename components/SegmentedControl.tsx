import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface SegmentedControlProps<T extends string> {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
  labelFn?: (value: T) => string;
}

export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  labelFn,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: `${colors.inputBgFrom}80` }]}>
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={(state: any) => [
              styles.option,
              isActive && [styles.optionActive, { backgroundColor: colors.cardBgFrom }],
              !isActive && state.hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
            ]}
          >
            {(state: any) => (
              <Text
                style={[
                  styles.label,
                  { color: isActive ? colors.textPrimary : (state.hovered ? colors.textPrimary : colors.textMuted) },
                  isActive && styles.labelActive,
                ]}
              >
                {labelFn ? labelFn(option) : option}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  optionActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  labelActive: {
    fontWeight: '600',
  },
});
