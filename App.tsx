import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider, useAppState } from './src/state/AppState';
import { colors } from './src/theme';
import { TabBar } from './src/ui/components/TabBar';
import { NavigationProvider, useNavigation } from './src/ui/navigation';
import { CaptureScreen } from './src/ui/screens/CaptureScreen';
import { CollectionScreen } from './src/ui/screens/CollectionScreen';
import { CorrectScreen } from './src/ui/screens/CorrectScreen';
import { FindScreen } from './src/ui/screens/FindScreen';
import { OnboardingScreen, UnavailableScreen } from './src/ui/screens/OnboardingScreen';
import { SettingsScreen } from './src/ui/screens/SettingsScreen';
import { TaxonScreen } from './src/ui/screens/TaxonScreen';
import { TreeScreen } from './src/ui/screens/TreeScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <NavigationProvider>
          <StatusBar style="light" />
          <Root />
        </NavigationProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const state = useAppState();
  const nav = useNavigation();

  if (!state.hydrated) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (state.settings.ageGate === 'blocked') return <UnavailableScreen />;
  if (!state.settings.onboardingComplete) return <OnboardingScreen />;

  const top = nav.stack[nav.stack.length - 1];
  if (top?.name === 'find') return <FindScreen key={top.sightingId} sightingId={top.sightingId} />;
  if (top?.name === 'taxon') return <TaxonScreen key={top.taxonId} taxonId={top.taxonId} />;
  if (top?.name === 'correct') return <CorrectScreen key={top.sightingId} sightingId={top.sightingId} />;

  return (
    <View style={styles.fill}>
      <View style={styles.fill}>
        {nav.tab === 'tree' && <TreeScreen />}
        {nav.tab === 'capture' && <CaptureScreen />}
        {nav.tab === 'collection' && <CollectionScreen />}
        {nav.tab === 'settings' && <SettingsScreen />}
      </View>
      <TabBar active={nav.tab} onChange={nav.setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
});
