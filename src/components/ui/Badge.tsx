import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, spacing } from '@/core/theme';
import { useTheme } from '@/core/themeStore';
import { ScanStatusType, STATUS_DETAILS } from '@/core/constants';

interface BadgeProps {
  status: ScanStatusType;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md', style }) => {
  const { colors } = useTheme();
  const details = STATUS_DETAILS[status] || STATUS_DETAILS.UNVERIFIED;
  const statusColor = colors[details.colorKey];

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingHorizontal: 8, paddingVertical: 3 };
      case 'lg':
        return { paddingHorizontal: 16, paddingVertical: 6 };
      default:
        return { paddingHorizontal: 12, paddingVertical: 4 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 11;
      case 'lg':
        return 16;
      default:
        return 13;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 12;
      case 'lg':
        return 18;
      default:
        return 15;
    }
  };

  return (
    <View
      style={[
        styles.badge,
        size === 'lg' && { alignSelf: 'center' },
        getPadding(),
        {
          backgroundColor: statusColor + '20', // 20% opacity
          borderColor: statusColor,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={details.vectorIcon as any}
        size={getIconSize()}
        color={statusColor}
        style={{ marginRight: 6 }}
      />
      <Text
        style={[
          styles.text,
          {
            color: statusColor,
            fontSize: getFontSize(),
          },
        ]}
      >
        {details.badge}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
