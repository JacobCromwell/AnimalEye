import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, spacing } from '../../theme';
import type { Tab } from '../navigation';

const TABS: { key: Tab; label: string }[] = [
  { key: 'tree', label: 'Tree' },
  { key: 'capture', label: 'Spot' },
  { key: 'collection', label: 'Collection' },
  { key: 'settings', label: 'Settings' },
];

function Icon({ tab, color }: { tab: Tab; color: string }) {
  const common = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {tab === 'tree' && (
        <>
          <Path d="M12 21V12M12 12C12 8 8 7 5 5M12 12C12 8 16 7 19 5M12 15C9 14 7 12 6 10M12 15C15 14 17 12 18 10" {...common} />
          <Circle cx={5} cy={5} r={1.6} fill={color} />
          <Circle cx={19} cy={5} r={1.6} fill={color} />
          <Circle cx={6} cy={10} r={1.4} fill={color} />
          <Circle cx={18} cy={10} r={1.4} fill={color} />
        </>
      )}
      {tab === 'capture' && (
        <>
          <Rect x={3} y={7} width={18} height={13} rx={3} {...common} />
          <Path d="M8.5 7L10 4.5H14L15.5 7" {...common} />
          <Circle cx={12} cy={13.5} r={3.6} {...common} />
        </>
      )}
      {tab === 'collection' && (
        <>
          <Rect x={4} y={4} width={7} height={7} rx={2} {...common} />
          <Rect x={13} y={4} width={7} height={7} rx={2} {...common} />
          <Rect x={4} y={13} width={7} height={7} rx={2} {...common} />
          <Rect x={13} y={13} width={7} height={7} rx={2} {...common} />
        </>
      )}
      {tab === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3} {...common} />
          <Path d="M12 3V5.5M12 18.5V21M3 12H5.5M18.5 12H21M5.6 5.6L7.4 7.4M16.6 16.6L18.4 18.4M5.6 18.4L7.4 16.6M16.6 7.4L18.4 5.6" {...common} />
        </>
      )}
    </Svg>
  );
}

export function TabBar({ active, onChange }: { active: Tab; onChange(tab: Tab): void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const selected = tab.key === active;
        const color = selected ? colors.accent : colors.textFaint;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            style={styles.item}
          >
            <Icon tab={tab.key} color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: spacing.xs },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});
