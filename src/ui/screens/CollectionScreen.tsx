import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { coverFor, groupByTaxon, type Sighting } from '../../core/sightings';
import { getTaxonomy, labelFor } from '../../core/taxonomy';
import { useAppState } from '../../state/AppState';
import { colors, groupColor, spacing } from '../../theme';
import { SightingThumb } from '../components/SightingThumb';
import { Card, Screen, SectionTitle } from '../components/Screen';
import { formatDateTime, rankNote, statusLabel } from '../format';
import { useNavigation } from '../navigation';

export function CollectionScreen() {
  const state = useAppState();
  const nav = useNavigation();
  const taxonomy = getTaxonomy();
  const extras = useMemo(() => new Map(Object.entries(state.extras)), [state.extras]);

  const entries = useMemo(() => {
    const groups = groupByTaxon(state.sightings);
    return [...groups.entries()]
      .map(([taxonId, sightings]) => {
        const label = labelFor(taxonomy, taxonId, extras);
        const anchor = extras.get(taxonId)?.parentId ?? taxonId;
        return {
          taxonId,
          label,
          sightings,
          cover: coverFor(taxonId, groups, state.covers),
          groupId: taxonomy.topGroupOf.get(anchor) ?? 'animals',
          latest: sightings[0]?.observedAt ?? '',
        };
      })
      .sort((a, b) => b.latest.localeCompare(a.latest));
  }, [state.sightings, state.covers, taxonomy, extras]);

  const pending = state.sightings.filter((s) => s.status !== 'identified');

  return (
    <Screen title="Collection" subtitle={`${entries.length} kinds of animal · ${state.sightings.length} photos`}>
      {pending.length > 0 && (
        <>
          <SectionTitle>Not on the tree yet</SectionTitle>
          <Card>
            {pending.map((s) => (
              <PendingRow key={s.id} sighting={s} onPress={() => nav.push({ name: 'find', sightingId: s.id })} />
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Your animals</SectionTitle>
      {entries.length === 0 ? (
        <Text style={styles.empty}>Nothing here yet. Head outside and photograph the first animal you see!</Text>
      ) : (
        entries.map((entry) => {
          const color = groupColor(entry.groupId);
          const note = rankNote(entry.label?.rank);
          return (
            <Pressable
              key={entry.taxonId}
              accessibilityRole="button"
              onPress={() => nav.push({ name: 'taxon', taxonId: entry.taxonId })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <SightingThumb uri={entry.cover?.thumbnailUri} size={56} color={color} fallbackLetter={entry.label?.commonName.charAt(0)} />
              <View style={styles.rowText}>
                <Text style={styles.name}>{entry.label?.commonName ?? 'Unknown'}</Text>
                {entry.label?.scientificName ? <Text style={styles.sci}>{entry.label.scientificName}</Text> : null}
                <Text style={styles.meta}>
                  {entry.sightings.length === 1 ? '1 sighting' : `${entry.sightings.length} sightings`}
                  {note ? ` · ${note}` : ''}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

function PendingRow({ sighting, onPress }: { sighting: Sighting; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.pending, pressed && styles.pressed]}>
      <SightingThumb uri={sighting.thumbnailUri} size={40} color={colors.textFaint} />
      <View style={styles.rowText}>
        <Text style={styles.pendingStatus}>{statusLabel(sighting)}</Text>
        <Text style={styles.meta}>{formatDateTime(sighting.observedAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
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
  pressed: { opacity: 0.75 },
  rowText: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  sci: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  meta: { color: colors.textFaint, fontSize: 12 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pendingStatus: { color: colors.text, fontSize: 14 },
});
