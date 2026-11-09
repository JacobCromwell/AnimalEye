// Minimal navigation: four tabs plus a stack of detail screens on top.
// Deliberately dependency-free; swap for Expo Router later if the app outgrows it.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';

export type Tab = 'tree' | 'collection' | 'capture' | 'settings';

export type Route =
  | { name: 'find'; sightingId: string }
  | { name: 'taxon'; taxonId: string }
  | { name: 'correct'; sightingId: string };

interface Navigation {
  tab: Tab;
  stack: Route[];
  setTab(tab: Tab): void;
  push(route: Route): void;
  replace(route: Route): void;
  back(): void;
}

const NavContext = createContext<Navigation | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTabState] = useState<Tab>('tree');
  const [stack, setStack] = useState<Route[]>([]);

  const setTab = useCallback((next: Tab) => {
    setStack([]);
    setTabState(next);
  }, []);
  const push = useCallback((route: Route) => setStack((s) => [...s, route]), []);
  const replace = useCallback((route: Route) => setStack((s) => [...s.slice(0, -1), route]), []);
  const back = useCallback(() => setStack((s) => s.slice(0, -1)), []);

  // Android hardware back pops detail screens first.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length === 0) return false;
      back();
      return true;
    });
    return () => subscription.remove();
  }, [stack.length, back]);

  const value = useMemo(() => ({ tab, stack, setTab, push, replace, back }), [tab, stack, setTab, push, replace, back]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNavigation(): Navigation {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useNavigation must be used inside NavigationProvider');
  return nav;
}
