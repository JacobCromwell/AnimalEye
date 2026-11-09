import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme';

interface Props {
  uri: string | null | undefined;
  size: number;
  color: string;
  fallbackLetter?: string;
}

/** Round photo with a colored ring; a lettered disc when there's no photo. */
export function SightingThumb({ uri, size, color, fallbackLetter = '?' }: Props) {
  const style = { width: size, height: size, borderRadius: size / 2, borderColor: color };
  if (uri) return <Image source={{ uri }} style={[styles.base, style]} accessibilityIgnoresInvertColors />;
  return (
    <View style={[styles.base, styles.empty, style, { backgroundColor: color + '33' }]}>
      <Text style={[styles.letter, { color, fontSize: size * 0.42 }]}>{fallbackLetter.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 2, backgroundColor: colors.surfaceRaised },
  empty: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '700' },
});
