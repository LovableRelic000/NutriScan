import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { borderRadius, shadows, spacing } from '@/core/theme';
import { useTheme } from '@/core/themeStore';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: keyof typeof spacing;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
}) => {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        };
      case 'flat':
        return {
          backgroundColor: colors.surfaceVariant,
        };
      case 'elevated':
      default:
        return {
          backgroundColor: colors.surface,
          ...shadows.sm,
          borderWidth: 1,
          borderColor: colors.border,
        };
    }
  };

  return (
    <View
      style={[
        styles.card,
        { padding: spacing[padding] },
        getVariantStyles(),
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});
