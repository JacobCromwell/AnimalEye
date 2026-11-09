// Taking or choosing a photo, then making two compressed copies:
//   - an identification image (longest side 1024 px), sent to the identifier and then deleted
//   - a thumbnail (longest side 384 px), kept on the device for the tree and collection

import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import type { PhotoSource } from '../core/sightings';

const ID_IMAGE_MAX_SIDE = 1024;
const THUMBNAIL_MAX_SIDE = 384;

export interface CapturedPhoto {
  source: PhotoSource;
  idImageBase64: string;
  thumbnailUri: string;
  exif: Record<string, unknown> | null;
}

export type CaptureOutcome =
  | { status: 'ok'; photo: CapturedPhoto }
  | { status: 'canceled' }
  | { status: 'denied'; message: string }
  | { status: 'error'; message: string };

async function renderJpeg(uri: string, width: number, height: number, maxSide: number, compress: number) {
  const context = ImageManipulator.manipulate(uri);
  const longest = Math.max(width, height);
  if (longest === 0) context.resize({ width: maxSide });
  else if (longest > maxSide) context.resize(width >= height ? { width: maxSide } : { height: maxSide });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress, format: SaveFormat.JPEG, base64: true });
  context.release();
  image.release();
  if (!result.base64) throw new Error('Could not process the photo');
  return result.base64;
}

async function processPickerResult(result: ImagePicker.ImagePickerResult, source: PhotoSource): Promise<CaptureOutcome> {
  if (result.canceled || !result.assets?.length) return { status: 'canceled' };
  const asset = result.assets[0];
  try {
    const [idImageBase64, thumbBase64] = await Promise.all([
      renderJpeg(asset.uri, asset.width, asset.height, ID_IMAGE_MAX_SIDE, 0.7),
      renderJpeg(asset.uri, asset.width, asset.height, THUMBNAIL_MAX_SIDE, 0.6),
    ]);
    return {
      status: 'ok',
      photo: {
        source,
        idImageBase64,
        thumbnailUri: `data:image/jpeg;base64,${thumbBase64}`,
        exif: asset.exif ?? null,
      },
    };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not process the photo' };
  }
}

export async function takePhoto(): Promise<CaptureOutcome> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return { status: 'denied', message: 'AnimalEye needs camera access to take photos. You can allow it in Settings.' };
    }
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, exif: true });
  return processPickerResult(result, 'camera');
}

export async function pickFromGallery(): Promise<CaptureOutcome> {
  // On the web the picker never reports a cancel, so callers must not block the UI on this.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    exif: true,
    allowsMultipleSelection: false,
  });
  return processPickerResult(result, 'gallery');
}
