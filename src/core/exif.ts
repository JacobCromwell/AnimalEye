// Reads when and where a gallery photo was taken from its EXIF metadata.
// expo-image-picker returns EXIF in platform-specific shapes:
//   Android: flat keys — DateTimeOriginal, GPSLatitude (number or "38/1,30/1,1234/100"), GPSLatitudeRef
//   iOS:     nested dictionaries — {Exif}.DateTimeOriginal, {GPS}.Latitude + LatitudeRef
// Anything we can't parse confidently is ignored rather than guessed.

export interface ExifProvenance {
  /** ISO 8601 timestamp, if the photo says when it was taken. */
  takenAt?: string;
  location?: { latitude: number; longitude: number };
}

type ExifRecord = Record<string, unknown>;

function asRecord(value: unknown): ExifRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as ExifRecord) : undefined;
}

function pick(exif: ExifRecord, nestedKey: string, ...keys: string[]): unknown {
  const nested = asRecord(exif[nestedKey]);
  for (const key of keys) {
    if (exif[key] !== undefined && exif[key] !== null) return exif[key];
    if (nested && nested[key] !== undefined && nested[key] !== null) return nested[key];
  }
  return undefined;
}

function parseRational(part: string): number {
  const [num, den] = part.split('/').map((s) => Number.parseFloat(s.trim()));
  if (den === undefined) return num;
  return den === 0 ? Number.NaN : num / den;
}

/** Degrees from a number, "38.5", "38/1,30/1,1234/100", or [38, 30, 12.34]. */
export function parseCoordinate(value: unknown): number | undefined {
  let parts: number[];
  if (typeof value === 'number') parts = [value];
  else if (Array.isArray(value)) parts = value.map((v) => (typeof v === 'number' ? v : parseRational(String(v))));
  else if (typeof value === 'string') parts = value.split(',').map(parseRational);
  else return undefined;
  if (parts.length === 0 || parts.some((p) => !Number.isFinite(p))) return undefined;
  const [deg, min = 0, sec = 0] = parts;
  return deg + min / 60 + sec / 3600;
}

function applyRef(value: number, ref: unknown, negativeRef: string): number {
  if (typeof ref === 'string' && ref.trim().toUpperCase().startsWith(negativeRef)) return -Math.abs(value);
  return value;
}

/** "2026:11:08 14:23:05" (+ optional "-05:00") → ISO string. Without an offset, uses device time zone. */
export function parseExifDate(value: unknown, offset?: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const [, y, mo, d, h, mi, s] = match.map(Number);
  if (y < 1990 || mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  if (typeof offset === 'string' && /^[+-]\d{2}:\d{2}$/.test(offset.trim())) {
    const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${offset.trim()}`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  const date = new Date(y, mo - 1, d, h, mi, s);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function provenanceFromExif(exifInput: unknown): ExifProvenance {
  const exif = asRecord(exifInput);
  if (!exif) return {};
  const result: ExifProvenance = {};

  const takenAt = parseExifDate(
    pick(exif, '{Exif}', 'DateTimeOriginal', 'DateTimeDigitized', 'DateTime'),
    pick(exif, '{Exif}', 'OffsetTimeOriginal', 'OffsetTime'),
  );
  if (takenAt) result.takenAt = takenAt;

  const lat = parseCoordinate(pick(exif, '{GPS}', 'GPSLatitude', 'Latitude'));
  const lon = parseCoordinate(pick(exif, '{GPS}', 'GPSLongitude', 'Longitude'));
  if (lat !== undefined && lon !== undefined) {
    const latitude = applyRef(lat, pick(exif, '{GPS}', 'GPSLatitudeRef', 'LatitudeRef'), 'S');
    const longitude = applyRef(lon, pick(exif, '{GPS}', 'GPSLongitudeRef', 'LongitudeRef'), 'W');
    const valid = Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && !(latitude === 0 && longitude === 0);
    if (valid) result.location = { latitude, longitude };
  }
  return result;
}
