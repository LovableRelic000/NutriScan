import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, spacing, colors } from '@/core/theme';
import { useTheme } from '@/core/themeStore';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  vectorIcon?: string;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  style,
  textStyle,
  vectorIcon,
  disabled = false,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primaryLight : colors.surfaceVariant,
          borderColor: selected ? colors.primary : colors.border,
        },
        style,
      ]}
    >
      {vectorIcon ? (
        <MaterialCommunityIcons
          name={vectorIcon as any}
          size={16}
          color={selected ? colors.primary : colors.textSecondary}
          style={{ marginRight: 6 }}
        />
      ) : null}
      <Text
        style={[
          styles.text,
          {
            color: selected ? colors.primary : colors.textSecondary,
            fontWeight: selected ? '700' : '500',
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedChip: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  unselectedChip: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  unselectedText: {
    color: colors.textSecondary,
  },
});
