// Componente visual de anillo circular de progreso con react-native-svg

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/core/themeStore';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 a 100
  color: string;
  backgroundColor?: string;
  icon?: string;
  vectorIcon?: string;
  valueText: string;
  unitText: string;
  labelText: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  size = 140,
  strokeWidth = 12,
  progress,
  color,
  backgroundColor,
  icon,
  vectorIcon,
  valueText,
  unitText,
  labelText,
}) => {
  const { colors } = useTheme();
  const ringBg = backgroundColor || colors.border;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (circumference * clampedProgress) / 100;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Círculo de fondo */}
        <Circle
          stroke={ringBg}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Círculo de progreso con rotación de -90 grados para iniciar arriba */}
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Contenido centrado */}
      <View style={styles.centerContent}>
        {vectorIcon ? (
          <MaterialCommunityIcons
            name={vectorIcon as any}
            size={22}
            color={color}
            style={{ marginBottom: 2 }}
          />
        ) : icon ? (
          <Text style={styles.icon}>{icon}</Text>
        ) : null}
        <Text style={[styles.valueText, { color }]}>{valueText}</Text>
        <Text style={[styles.unitText, { color: colors.textSecondary }]}>{unitText}</Text>
        <Text style={[styles.labelText, { color: colors.textMuted }]}>{labelText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
  },
  valueText: {
    fontSize: 22,
    fontWeight: '800',
  },
  unitText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
