import type { LocationSource, Sighting, TimeSource } from '../core/sightings';
import type { NodeRank } from '../core/taxonomy/types';

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPlace(sighting: Sighting): string {
  if (!sighting.location) return 'No location';
  const { latitude, longitude, accuracyMeters } = sighting.location;
  const ns = latitude >= 0 ? 'N' : 'S';
  const ew = longitude >= 0 ? 'E' : 'W';
  const accuracy = accuracyMeters ? ` (±${Math.round(accuracyMeters)} m)` : '';
  return `${Math.abs(latitude).toFixed(4)}° ${ns}, ${Math.abs(longitude).toFixed(4)}° ${ew}${accuracy}`;
}

export const timeSourceLabel: Record<TimeSource, string> = {
  capture: 'when the photo was taken',
  photo_metadata: "from the photo's details",
  upload_time: 'when it was added (photo had no date)',
};

export const locationSourceLabel: Record<LocationSource, string> = {
  device_gps: "from your phone's location",
  photo_metadata: "from the photo's details",
  none: 'not available',
};

export function rankNote(rank: NodeRank | undefined): string | null {
  switch (rank) {
    case 'genus':
      return 'Identified to genus';
    case 'family':
      return 'Identified to family';
    case 'order':
    case 'class':
    case 'group':
      return 'Identified to group';
    default:
      return null;
  }
}

export function statusLabel(sighting: Sighting): string {
  switch (sighting.status) {
    case 'identifying':
      return 'Identifying…';
    case 'queued':
      switch (sighting.queueReason) {
        case 'daily_limit':
          return 'Daily limit reached. Will identify tomorrow';
        case 'offline':
          return 'Offline. Will identify when connected';
        case 'error':
          return 'Server busy. Will retry soon';
        default:
          return 'Waiting to identify';
      }
    case 'identified':
      return 'Identified';
    case 'no_animal':
      return 'No animal found';
    case 'rejected':
      return 'Photo removed';
    case 'failed':
      return 'Could not identify';
  }
}

export function percent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
