import * as Location from 'expo-location';

import type { SightingLocation } from '../core/sightings';

/** Best-effort current position. Returns null if denied, unavailable, or too slow. */
export async function currentLocation(timeoutMs = 8000): Promise<SightingLocation | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const position =
      (await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeout])) ??
      (await Location.getLastKnownPositionAsync());
    if (!position) return null;
    const { latitude, longitude, accuracy } = position.coords;
    return { latitude, longitude, accuracyMeters: accuracy ?? undefined };
  } catch {
    return null;
  }
}
