// Every sighting of one kind of animal.

import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { coverFor, groupByTaxon } from '../../core/sightings';
import { getTaxonomy, labelFor } from '../../core/taxonomy';
import { useAppState } from '../../state/AppState';
import { colors, groupColor, spacing } from '../../theme';
import { SightingThumb } from '../components/SightingThumb';
import { Screen, SectionTitle } from '../components/Screen';
import { formatDateTime, formatPlace, rankNote } from '../format';
import { useNavigation } from '../navigation';

export function TaxonScreen({ taxonId }: { taxonId: string }) {
  const state = useAppState();
  const nav = useNavigation();
  const taxonomy = getTaxonomy();
  const extras = useMemo(() => new Map(Object.entries(state.extras)), [state.extras]);
  const groups = useMemo(() => groupByTaxon(state.sightings), [state.sightings]);
  const sightings = groups.get(taxonId) ?? [];
  const label = labelFor(taxonomy, taxonId, extras);
  const anchor = extras.get(taxonId)?.parentId ?? taxonId;
  const color = groupColor(taxonomy.topGroupOf.get(anchor));
  const cover = coverFor(taxonId, groups, state.covers);
  const groupName = taxonomy.nodes.get(taxonomy.topGroupOf.get(anchor) ?? '')?.commonName;

  return (
    <Screen title={label?.commonName ?? 'Unknown'} subtitle={label?.scientificName ?? undefined} onBack={nav.back}>
      {cover?.thumbnailUri ? (
        <Image source={{ uri: cover.thumbnailUri }} style={[styles.cover, { borderColor: color }]} resizeMode="cover" />
      ) : null}
      <View style={styles.badges}>
        {groupName ? <Text style={[styles.badge, { color, borderColor: color }]}>{groupName}</Text> : null}
        {rankNote(label?.rank) ? <Text style={styles.badgeMuted}>{rankNote(label?.rank)}</Text> : null}
      </View>

      <SectionTitle>{sightings.length === 1 ? '1 sighting' : `${sightings.length} sightings`}</SectionTitle>
      {sightings.map((s) => (
        <Pressable
          key={s.id}
          accessibilityRole="button"
          onPress={() => nav.push({ name: 'find', sightingId: s.id })}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
        >
          <SightingThumb uri={s.thumbnailUri} size={52} color={color} fallbackLetter={label?.commonName.charAt(0)} />
          <View style={styles.rowText}>
            <Text style={styles.when}>{formatDateTime(s.observedAt)}</Text>
            <Text style={styles.where}>{formatPlace(s)}</Text>
            {state.covers[taxonId] === s.id ? <Text style={styles.coverTag}>Cover photo</Text> : null}
          </View>
        </Pressable>
      ))}
      {sightings.length === 0 && <Text style={styles.where}>No sightings of this animal yet.</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 1.4, borderRadius: 20, borderWidth: 2 },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 4, fontSize: 13, fontWeight: '600' },
  badgeMuted: { color: colors.textMuted, fontSize: 13, paddingVertical: 5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: { flex: 1, gap: 2 },
  when: { color: colors.text, fontSize: 15, fontWeight: '600' },
  where: { color: colors.textMuted, fontSize: 13 },
  coverTag: { color: colors.accent, fontSize: 12, fontWeight: '600' },
});
