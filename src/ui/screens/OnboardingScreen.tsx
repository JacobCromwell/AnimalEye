// First launch: welcome → neutral age question → research opt-in → region.
// The age question doesn't hint at the cutoff, and only the pass/fail result is stored.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { checkAge } from '../../core/age';
import type { RegionSetting } from '../../core/taxonomy/types';
import { useActions, useAppState } from '../../state/AppState';
import { colors, radius, spacing } from '../../theme';
import { Button } from '../components/Button';
import { RegionPicker } from '../components/RegionPicker';
import { Screen } from '../components/Screen';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Step = 'welcome' | 'age' | 'research' | 'region';

export function OnboardingScreen() {
  const state = useAppState();
  const actions = useActions();
  const [step, setStep] = useState<Step>(state.settings.ageGate === 'passed' ? 'research' : 'welcome');
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState('');
  const [ageError, setAgeError] = useState<string | null>(null);
  const [region, setRegion] = useState<RegionSetting>(state.settings.region);

  if (step === 'welcome') {
    return (
      <Screen>
        <View style={styles.welcome}>
          <Text style={styles.brand}>AnimalEye</Text>
          <Text style={styles.tagline}>Get outside. Spot animals. Grow your own tree of life.</Text>
        </View>
        <Button label="Get started" onPress={() => setStep('age')} />
      </Screen>
    );
  }

  if (step === 'age') {
    const submit = () => {
      const result = checkAge(Number.parseInt(year, 10), month ?? 0);
      if (result === 'invalid') {
        setAgeError('Please check the month and year.');
        return;
      }
      if (result === 'too_young') {
        actions.updateSettings({ ageGate: 'blocked' });
        return;
      }
      actions.updateSettings({ ageGate: 'passed' });
      setStep('research');
    };
    return (
      <Screen title="When were you born?">
        <View style={styles.months}>
          {MONTHS.map((name, index) => {
            const selected = month === index + 1;
            return (
              <Pressable
                key={name}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setMonth(index + 1)}
                style={[styles.month, selected && styles.monthSelected]}
              >
                <Text style={[styles.monthText, selected && styles.monthTextSelected]}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={year}
          onChangeText={(text) => setYear(text.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder="Year"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          maxLength={4}
          style={styles.input}
          accessibilityLabel="Birth year"
        />
        {ageError ? <Text style={styles.error}>{ageError}</Text> : null}
        <Button label="Continue" onPress={submit} disabled={month === null || year.length !== 4} />
      </Screen>
    );
  }

  if (step === 'research') {
    const choose = (shareWithResearch: boolean) => {
      actions.updateSettings({ shareWithResearch });
      setStep('region');
    };
    return (
      <Screen title="Help science?">
        <Text style={styles.body}>
          Your sightings (species, date and place) could help biologists track migrations and wildlife health. Would
          you like to share them with researchers? You can change this any time in Settings.
        </Text>
        <Button label="Yes, share my sightings" onPress={() => choose(true)} />
        <Button label="Not now" variant="secondary" onPress={() => choose(false)} />
      </Screen>
    );
  }

  return (
    <Screen title="Where do you explore?">
      <Text style={styles.body}>Your tree will suggest animals commonly seen in this region. Choose Global to see everything.</Text>
      <RegionPicker value={region} onChange={setRegion} />
      <Button label="Start exploring" onPress={() => actions.updateSettings({ region, onboardingComplete: true })} />
    </Screen>
  );
}

export function UnavailableScreen() {
  return (
    <Screen>
      <View style={styles.welcome}>
        <Text style={styles.brand}>AnimalEye</Text>
        <Text style={styles.tagline}>Sorry, AnimalEye isn't available for you right now.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: { paddingTop: 120, paddingBottom: 60, gap: spacing.lg },
  brand: { color: colors.text, fontSize: 44, fontWeight: '200', letterSpacing: 2 },
  tagline: { color: colors.textMuted, fontSize: 18, lineHeight: 26 },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  month: {
    width: '22%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  monthSelected: { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
  monthText: { color: colors.textMuted, fontSize: 15 },
  monthTextSelected: { color: colors.text, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    letterSpacing: 2,
  },
  error: { color: colors.danger, fontSize: 14 },
});
