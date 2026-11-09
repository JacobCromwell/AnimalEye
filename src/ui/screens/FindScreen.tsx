// One sighting: the photo, what it was identified as, and when/where/how it was recorded.

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { config } from '../../config';
import { countsForLeaderboard, finalTaxonId } from '../../core/sightings';
import { getTaxonomy, labelFor } from '../../core/taxonomy';
import { useActions, useAppState } from '../../state/AppState';
import { colors, groupColor, spacing } from '../../theme';
import { Button } from '../components/Button';
import { Card, Screen } from '../components/Screen';
import {
  formatDateTime,
  formatPlace,
  locationSourceLabel,
  percent,
  rankNote,
  statusLabel,
  timeSourceLabel,
} from '../format';
import { useNavigation } from '../navigation';

export function FindScreen({ sightingId }: { sightingId: string }) {
  const state = useAppState();
  const actions = useActions();
  const nav = useNavigation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const taxonomy = getTaxonomy();
  const extras = useMemo(() => new Map(Object.entries(state.extras)), [state.extras]);
  const sighting = state.sightings.find((s) => s.id === sightingId);

  if (!sighting) {
    return (
      <Screen title="Sighting" onBack={nav.back}>
        <Text style={styles.muted}>This sighting was deleted.</Text>
      </Screen>
    );
  }

  const taxonId = finalTaxonId(sighting);
  const label = taxonId ? labelFor(taxonomy, taxonId, extras) : null;
  const modelLabel = sighting.modelTaxonId ? labelFor(taxonomy, sighting.modelTaxonId, extras) : null;
  const best = sighting.identification?.result.candidates[0];
  const anchor = taxonId ? extras.get(taxonId)?.parentId ?? taxonId : undefined;
  const color = groupColor(anchor ? taxonomy.topGroupOf.get(anchor) : undefined);
  const isCover = taxonId ? state.covers[taxonId] === sighting.id : false;
  const busy = sighting.status === 'identifying' || (sighting.status === 'queued' && sighting.queueReason === 'pending');

  return (
    <Screen title={label?.commonName ?? statusLabel(sighting)} subtitle={label?.scientificName ?? undefined} onBack={nav.back}>
      {sighting.thumbnailUri ? (
        <Image source={{ uri: sighting.thumbnailUri }} style={[styles.photo, { borderColor: color }]} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.noPhoto]}>
          <Text style={styles.muted}>
            {sighting.photoDiscardedReason === 'contains_people'
              ? 'Photo not kept because it showed a person.'
              : sighting.photoDiscardedReason === 'inappropriate'
                ? 'Photo removed.'
                : 'No photo'}
          </Text>
        </View>
      )}

      {busy && (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Identifying…</Text>
        </View>
      )}

      {sighting.status === 'identified' && label && (
        <Card>
          <Text style={[styles.bigName, { color }]}>{label.commonName}</Text>
          {!!rankNote(label.rank) && <Text style={styles.muted}>{rankNote(label.rank)}: the exact species wasn't certain.</Text>}
          {label.isExtra && <Text style={styles.muted}>A new branch on your tree: this one isn't in the standard set.</Text>}
          {!!best && !sighting.userTaxonId && (
            <Text style={styles.muted}>
              Model's confidence: {percent(best.confidence)} ({sighting.identification?.provider}
              {sighting.identification?.model ? `, ${sighting.identification.model}` : ''})
            </Text>
          )}
          {!!sighting.userTaxonId && !!modelLabel && (
            <Text style={styles.muted}>You changed this from the model's answer: {modelLabel.commonName}.</Text>
          )}
          {config.allowUserCorrections && (
            <Button label="Not right? Change it" variant="secondary" onPress={() => nav.push({ name: 'correct', sightingId })} />
          )}
        </Card>
      )}

      {sighting.status !== 'identified' && !busy && (
        <Card>
          <Text style={styles.statusTitle}>{statusLabel(sighting)}</Text>
          {sighting.status === 'no_animal' && (
            <Text style={styles.muted}>
              {sighting.identification?.result.notes ?? "We couldn't spot an animal in this photo."} Try a closer or clearer shot.
            </Text>
          )}
          {!!sighting.lastError && sighting.status !== 'no_animal' && <Text style={styles.muted}>{sighting.lastError}</Text>}
          {sighting.status === 'queued' && (
            <Button label="Try again now" variant="secondary" onPress={() => actions.processQueue({ force: true })} />
          )}
        </Card>
      )}

      <Card>
        <Detail label="When" value={formatDateTime(sighting.observedAt)} note={timeSourceLabel[sighting.observedAtSource]} />
        <Detail label="Where" value={formatPlace(sighting)} note={locationSourceLabel[sighting.locationSource]} />
        <Detail label="Photo" value={sighting.photoSource === 'camera' ? 'Taken in the app' : 'From your gallery'} />
        <Detail label="Shared with researchers" value={sighting.shareWithResearch ? 'Yes, when sharing launches' : 'No'} />
        {sighting.status === 'identified' && (
          <Detail
            label="Counts for leaderboards"
            value={countsForLeaderboard(sighting) ? 'Yes' : 'No'}
            note={countsForLeaderboard(sighting) ? undefined : 'Only camera photos with the original ID count'}
          />
        )}
      </Card>

      {!!taxonId && (
        <View style={styles.actions}>
          {!!sighting.thumbnailUri && !isCover && (
            <Button label="Use as cover photo" variant="secondary" onPress={() => actions.setCover(taxonId, sighting.id)} />
          )}
          <Button
            label={`All ${label?.commonName ?? ''} sightings`}
            variant="ghost"
            onPress={() => nav.replace({ name: 'taxon', taxonId })}
          />
        </View>
      )}

      <Button
        label={confirmDelete ? 'Tap again to delete' : 'Delete this sighting'}
        variant="danger"
        onPress={async () => {
          if (!confirmDelete) {
            setConfirmDelete(true);
            return;
          }
          await actions.deleteSighting(sighting.id);
          nav.back();
        }}
      />
    </Screen>
  );
}

function Detail({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
      {note ? <Text style={styles.detailNote}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1, borderRadius: 20, borderWidth: 2, borderColor: colors.border },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  busy: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'center' },
  bigName: { fontSize: 24, fontWeight: '600' },
  statusTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  detail: { gap: 2 },
  detailLabel: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  detailValue: { color: colors.text, fontSize: 15 },
  detailNote: { color: colors.textFaint, fontSize: 12 },
  actions: { gap: spacing.sm },
});
