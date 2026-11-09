import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { config } from '../../config';
import { getIdentificationClient } from '../../services/identification';
import { useActions, useAppState } from '../../state/AppState';
import { colors, spacing } from '../../theme';
import { Button } from '../components/Button';
import { Card, Screen } from '../components/Screen';
import { useNavigation } from '../navigation';

export function CaptureScreen() {
  const state = useAppState();
  const actions = useActions();
  const nav = useNavigation();
  const [busy, setBusy] = useState<'camera' | 'gallery' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const start = async (source: 'camera' | 'gallery') => {
    setMessage(null);
    // On the web the picker never reports "cancel", so don't lock the buttons there.
    if (Platform.OS !== 'web') setBusy(source);
    try {
      const result = await actions.capture(source);
      if (result.status === 'ok') nav.push({ name: 'find', sightingId: result.sightingId });
      else if (result.status === 'denied' || result.status === 'error') setMessage(result.message);
    } finally {
      setBusy(null);
    }
  };

  const waiting = state.sightings.filter((s) => s.status === 'queued' || s.status === 'identifying');
  const quota = state.lastQuota;
  const quotaText =
    config.identifierMode === 'local-mock'
      ? 'Mock mode: answers are pretend, and there is no daily limit.'
      : quota?.isAdmin
        ? 'Admin: unlimited identifications.'
        : quota && quota.limit !== null && new Date(quota.resetAt).getTime() > Date.now()
          ? `${Math.max(0, quota.limit - quota.used)} of ${quota.limit} identifications left today.`
          : 'You can identify 5 animals a day.';

  return (
    <Screen title="Spot an animal" subtitle={getIdentificationClient().label}>
      <View style={styles.hero}>
        <Text style={styles.heroText}>Take a photo of any animal (wild, pet or farm) and AnimalEye will find its place on your tree.</Text>
      </View>

      <Button label="Take a photo" onPress={() => start('camera')} busy={busy === 'camera'} disabled={busy !== null} />
      <Button
        label="Choose from gallery"
        variant="secondary"
        onPress={() => start('gallery')}
        busy={busy === 'gallery'}
        disabled={busy !== null}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.quota}>{quotaText}</Text>

      {waiting.length > 0 && (
        <Card>
          <Text style={styles.waitingTitle}>
            {waiting.length === 1 ? '1 photo waiting' : `${waiting.length} photos waiting`} to be identified
          </Text>
          <Text style={styles.waitingText}>
            They'll be identified automatically when you're online and under today's limit.
          </Text>
          <Button label="Try again now" variant="secondary" onPress={() => actions.processQueue({ force: true })} />
        </Card>
      )}

      <Text style={styles.safety}>Give wild animals space: zoom in rather than walking closer.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: spacing.lg },
  heroText: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  message: { color: colors.warning, fontSize: 14, lineHeight: 20 },
  quota: { color: colors.textFaint, fontSize: 13, textAlign: 'center' },
  waitingTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  waitingText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  safety: { color: colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: spacing.xl },
});
