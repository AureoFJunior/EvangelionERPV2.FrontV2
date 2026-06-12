import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { orderStatusOptions, OrderStatusOption } from './shared';

type OrderStatusPillsProps = {
  selected: OrderStatusOption;
  onSelect: (status: OrderStatusOption) => void;
  disabled?: boolean;
};

export function OrderStatusPills({ selected, onSelect, disabled = false }: OrderStatusPillsProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const badgeTone = (accent: string) => ({ text: accent, bg: `${accent}1A`, border: `${accent}40` });
  const statusBadgeColors: Record<string, { text: string; bg: string; border: string }> = {
    pending:    badgeTone(colors.accentOrange),
    processing: badgeTone(colors.secondaryPurple),
    paid:       badgeTone(colors.neonGreen),
    shipped:    badgeTone(colors.neonGreen),
    delivered:  badgeTone(colors.neonGreen),
    finished:   badgeTone(colors.neonGreen),
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.statusPillRow}>
        {orderStatusOptions.map((status) => {
          const isActive = status === selected;
          const key = status.toLowerCase();
          const badgeColor = statusBadgeColors[key] ?? badgeTone(colors.textMuted);
          return (
            <Pressable
              key={status}
              onPress={() => !disabled && onSelect(status)}
              style={(state: any) => [
                styles.statusPill,
                {
                  backgroundColor: isActive ? badgeColor.bg : 'transparent',
                  borderColor: isActive ? badgeColor.border : colors.cardBorder,
                },
                !isActive && state.hovered && { backgroundColor: `${badgeColor.bg}`, borderColor: badgeColor.border },
                disabled && { opacity: 0.5 },
              ]}
            >
              {isActive && <View style={[styles.statusPillDot, { backgroundColor: badgeColor.text }]} />}
              <Text
                style={[
                  styles.statusPillText,
                  { color: isActive ? badgeColor.text : colors.textMuted },
                ]}
              >
                {t(status)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statusPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    ...Platform.select({ web: { transition: 'all 0.15s ease', cursor: 'pointer' } as any, default: {} }),
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
