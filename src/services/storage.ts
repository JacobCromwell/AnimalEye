// On-device storage. AsyncStorage is backed by native storage on phones and by
// localStorage in the browser (about 5 MB there, so photos are kept small).

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'animaleye/';
const STATE_KEY = `${PREFIX}state/v1`;
const queueImageKey = (sightingId: string) => `${PREFIX}queue-image/${sightingId}`;

export async function loadJson<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveJson(value: unknown): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(value));
}

/** The larger image sent for identification, kept only until it has been identified. */
export async function saveQueueImage(sightingId: string, base64: string): Promise<void> {
  await AsyncStorage.setItem(queueImageKey(sightingId), base64);
}

export async function loadQueueImage(sightingId: string): Promise<string | null> {
  return AsyncStorage.getItem(queueImageKey(sightingId));
}

export async function deleteQueueImage(sightingId: string): Promise<void> {
  await AsyncStorage.removeItem(queueImageKey(sightingId));
}

/** Removes everything AnimalEye stored on this device. */
export async function clearAllLocalData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(PREFIX)));
}
