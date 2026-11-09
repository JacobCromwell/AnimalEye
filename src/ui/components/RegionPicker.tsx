import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { REGIONS, type RegionSetting } from '../../core/taxonomy/types';
import { colors, radius, spacing } from '../../theme';

export function RegionPicker({ value, onChange }: { value: RegionSetting; onChange(region: RegionSetting): void }) {
  return (
    <View style={styles.wrap}>
      {REGIONS.map((region) => {
        const selected = region.code === value;
        return (
          <Pressable
            key={region.code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(region.code)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{region.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  chipSelected: { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
  label: { color: colors.textMuted, fontSize: 14 },
  labelSelected: { color: colors.text, fontWeight: '600' },
});
