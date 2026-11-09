import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { coverFor, foundTaxonIds, groupByTaxon } from '../../core/sightings';
import { getTaxonomy, REGIONS } from '../../core/taxonomy';
import { layoutFan } from '../../core/tree/layout';
import { buildVisibleTree, flattenVisible, type VisibleNode } from '../../core/tree/visible';
import { useAppState } from '../../state/AppState';
import { colors, groupColor, radius, spacing } from '../../theme';
import { Button } from '../components/Button';
import { TreeView } from '../components/TreeView';
import { useNavigation } from '../navigation';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

export function TreeScreen() {
  const state = useAppState();
  const nav = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const [peekIds, setPeekIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null); // null = fit to screen
  const hScroll = useRef<ScrollView>(null);
  const vScroll = useRef<ScrollView>(null);

  const taxonomy = getTaxonomy();
  const foundIds = useMemo(() => foundTaxonIds(state.sightings), [state.sightings]);
  const extras = useMemo(() => new Map(Object.entries(state.extras)), [state.extras]);
  const groups = useMemo(() => groupByTaxon(state.sightings), [state.sightings]);
  const covers = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const id of groups.keys()) map.set(id, coverFor(id, groups, state.covers)?.thumbnailUri ?? null);
    return map;
  }, [groups, state.covers]);

  const visible = useMemo(
    () => buildVisibleTree({ taxonomy, foundIds, extras, region: state.settings.region, peekIds }),
    [taxonomy, foundIds, extras, state.settings.region, peekIds],
  );
  const layout = useMemo(() => layoutFan(visible), [visible]);
  const selected = useMemo(
    () => (selectedId ? flattenVisible(visible).find((n) => n.id === selectedId) ?? null : null),
    [visible, selectedId],
  );

  const fitZoom = Math.min(1.2, Math.max(MIN_ZOOM, (screenWidth - spacing.lg) / layout.width));
  const effectiveZoom = zoom ?? fitZoom;

  // Bring the root into view on first show and when "Fit" is pressed.
  useEffect(() => {
    const timer = setTimeout(() => {
      const x = Math.max(0, layout.origin.x * effectiveZoom - screenWidth / 2);
      hScroll.current?.scrollTo({ x, animated: false });
      vScroll.current?.scrollToEnd({ animated: false });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenter]);

  const togglePeek = (id: string) =>
    setPeekIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onPressNode = (node: VisibleNode) => {
    setSelectedId(node.id);
    if (node.kind === 'collapsed') togglePeek(node.id);
  };

  const regionLabel = REGIONS.find((r) => r.code === state.settings.region)?.label ?? 'Global';
  const zoomBy = (factor: number) =>
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, effectiveZoom * factor)));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Your tree</Text>
          <Text style={styles.subtitle}>
            {foundIds.size === 1 ? '1 animal found' : `${foundIds.size} animals found`} · {regionLabel}
          </Text>
        </View>
        <View style={styles.zoomRow}>
          <ZoomButton label="−" onPress={() => zoomBy(1 / 1.35)} />
          <ZoomButton label="Fit" onPress={() => { setZoom(null); setRecenter((n) => n + 1); }} />
          <ZoomButton label="+" onPress={() => zoomBy(1.35)} />
        </View>
      </View>

      <ScrollView ref={vScroll} style={styles.fill} contentContainerStyle={styles.vContent}>
        <ScrollView ref={hScroll} horizontal contentContainerStyle={styles.hContent} showsHorizontalScrollIndicator={false}>
          <TreeView layout={layout} covers={covers} zoom={effectiveZoom} selectedId={selected?.id} onPressNode={onPressNode} />
        </ScrollView>
      </ScrollView>

      {foundIds.size === 0 && !selected && (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintText}>Photograph an animal and its branch will grow here. Tap a group to peek inside.</Text>
        </View>
      )}

      {selected && selected.kind !== 'root' && (
        <View style={[styles.card, { borderColor: groupColor(selected.groupId) }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{selected.label}</Text>
            {selected.scientificName ? <Text style={styles.cardSci}>{selected.scientificName}</Text> : null}
            <Text style={styles.cardNote}>
              {selected.kind === 'found'
                ? 'Found! Tap below to see your sightings.'
                : selected.kind === 'unfound'
                  ? 'Not found yet. Keep exploring!'
                  : selected.kind === 'collapsed'
                    ? `${selected.hiddenCount} animals inside. Tap to peek.`
                    : selected.foundCount > 0
                      ? `${selected.foundCount} found in this group`
                      : 'Peeking inside this group'}
            </Text>
          </View>
          <View style={styles.cardActions}>
            {selected.kind === 'found' && (
              <Button label="Sightings" onPress={() => nav.push({ name: 'taxon', taxonId: selected.id })} />
            )}
            {selected.kind === 'branch' && peekIds.has(selected.id) && (
              <Button label="Close" variant="secondary" onPress={() => { togglePeek(selected.id); setSelectedId(null); }} />
            )}
            <Pressable accessibilityLabel="Dismiss" onPress={() => setSelectedId(null)} hitSlop={10} style={styles.dismiss}>
              <Text style={styles.dismissText}>×</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function ZoomButton({ label, onPress }: { label: string; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Zoom ${label}`} onPress={onPress} style={styles.zoomButton}>
      <Text style={styles.zoomText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  title: { color: colors.text, fontSize: 26, fontWeight: '300', letterSpacing: 0.5 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  zoomRow: { flexDirection: 'row', gap: spacing.xs },
  zoomButton: {
    minWidth: 40,
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  vContent: { flexGrow: 1, justifyContent: 'flex-end' },
  hContent: { flexGrow: 1, alignItems: 'flex-end', justifyContent: 'center' },
  hint: { position: 'absolute', left: spacing.xl, right: spacing.xl, top: 110 },
  hintText: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  card: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  cardSci: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  cardNote: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dismiss: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dismissText: { color: colors.textMuted, fontSize: 24 },
});
