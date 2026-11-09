// Lets a user correct an identification for themselves. The model's answer is kept
// alongside the correction (see Sighting.modelTaxonId / userTaxonId).

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { config } from '../../config';
import { finalTaxonId } from '../../core/sightings';
import { getTaxonomy, searchTaxa } from '../../core/taxonomy';
import { resolveGuess } from '../../core/taxonomy/resolve';
import type { TaxonGuess } from '../../../supabase/functions/_shared/identification/types';
import { useActions, useAppState } from '../../state/AppState';
import { colors, radius, spacing } from '../../theme';
import { Card, Screen, SectionTitle } from '../components/Screen';
import { percent } from '../format';
import { useNavigation } from '../navigation';

export function CorrectScreen({ sightingId }: { sightingId: string }) {
  const state = useAppState();
  const actions = useActions();
  const nav = useNavigation();
  const [query, setQuery] = useState('');
  const taxonomy = getTaxonomy();
  const sighting = state.sightings.find((s) => s.id === sightingId);
  const results = useMemo(() => searchTaxa(taxonomy, query, 25), [taxonomy, query]);

  if (!sighting || !config.allowUserCorrections) {
    return (
      <Screen title="Change ID" onBack={nav.back}>
        <Text style={styles.muted}>Corrections aren't available right now.</Text>
      </Screen>
    );
  }

  const current = finalTaxonId(sighting);
  const candidates = sighting.identification?.result.candidates ?? [];

  const chooseGuess = (guess: TaxonGuess) => {
    actions.correct(sightingId, { guess });
    nav.back();
  };
  const chooseTaxon = (taxonId: string) => {
    actions.correct(sightingId, { taxonId });
    nav.back();
  };

  return (
    <Screen title="Change ID" subtitle="Pick what this really is" onBack={nav.back}>
      {candidates.length > 0 && (
        <>
          <SectionTitle>The model's suggestions</SectionTitle>
          <Card>
            {candidates.map((guess, index) => {
              const id = resolveGuess(taxonomy, guess).taxonId;
              return (
                <Option
                  key={`${guess.scientificName}-${index}`}
                  title={guess.commonName}
                  subtitle={`${guess.scientificName} · ${percent(guess.confidence)}${index === 0 ? " · model's pick" : ''}`}
                  selected={id === current}
                  onPress={() => chooseGuess(guess)}
                />
              );
            })}
          </Card>
        </>
      )}

      <SectionTitle>Search all animals</SectionTitle>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="e.g. bobcat, robin, Lynx rufus"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Search animals"
      />
      {results.map((hit) => (
        <Option
          key={hit.id}
          title={hit.commonName}
          subtitle={hit.scientificName ?? hit.rank}
          selected={hit.id === current}
          onPress={() => chooseTaxon(hit.id)}
        />
      ))}
      {query.length >= 2 && results.length === 0 && <Text style={styles.muted}>No matches in the AnimalEye list.</Text>}
    </Screen>
  );
}

function Option({ title, subtitle, selected, onPress }: { title: string; subtitle: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && { opacity: 0.75 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      {selected ? <Text style={styles.check}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 14 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  optionSelected: { borderColor: colors.accent },
  optionTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  optionSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  check: { color: colors.accent, fontSize: 18, fontWeight: '700' },
});
