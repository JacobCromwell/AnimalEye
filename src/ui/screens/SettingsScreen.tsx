import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { config } from '../../config';
import { getIdentificationClient } from '../../services/identification';
import { useActions, useAppState } from '../../state/AppState';
import { colors, spacing } from '../../theme';
import { Button } from '../components/Button';
import { RegionPicker } from '../components/RegionPicker';
import { Card, Screen, SectionTitle } from '../components/Screen';

export function SettingsScreen() {
  const state = useAppState();
  const actions = useActions();
  const [confirmReset, setConfirmReset] = useState(false);
  const { settings } = state;

  return (
    <Screen title="Settings">
      <SectionTitle>Your region</SectionTitle>
      <Card>
        <Text style={styles.muted}>Neighbors on your tree are the animals commonly found in this region.</Text>
        <RegionPicker value={settings.region} onChange={(region) => actions.updateSettings({ region })} />
      </Card>

      <SectionTitle>Science</SectionTitle>
      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Share sightings with researchers</Text>
            <Text style={styles.muted}>
              Date, place and species from new sightings could help scientists track wildlife. Nothing is shared yet:
              this records your choice for when sharing launches.
            </Text>
          </View>
          <Switch
            value={settings.shareWithResearch}
            onValueChange={(shareWithResearch) => actions.updateSettings({ shareWithResearch })}
            trackColor={{ true: colors.accent, false: colors.border }}
            accessibilityLabel="Share sightings with researchers"
          />
        </View>
      </Card>

      <SectionTitle>Identification</SectionTitle>
      <Card>
        <Text style={styles.label}>{getIdentificationClient().label}</Text>
        <Text style={styles.muted}>
          Mode: {config.identifierMode}. Corrections are {config.allowUserCorrections ? 'on' : 'off'}.
        </Text>
      </Card>

      {state.storageError ? <Text style={styles.warning}>{state.storageError}</Text> : null}

      <SectionTitle>Your data</SectionTitle>
      <Card>
        <Text style={styles.muted}>
          Your sightings and small copies of your photos are stored on this device. Photos showing people are not
          kept.
        </Text>
        <Button
          label={confirmReset ? 'Tap again to delete everything' : 'Delete all AnimalEye data on this device'}
          variant="danger"
          onPress={() => {
            if (!confirmReset) setConfirmReset(true);
            else actions.resetAll();
          }}
        />
      </Card>
      <Text style={styles.version}>AnimalEye 0.1.0 (working title)</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  warning: { color: colors.warning, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  version: { color: colors.textFaint, fontSize: 12, textAlign: 'center' },
});
