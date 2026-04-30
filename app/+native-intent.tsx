export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  // Share intent URLs (contains "dataUrl=") are handled by expo-share-intent natively.
  // Return "/" to prevent Expo Router from trying to match them as routes.
  if (path.includes('dataUrl=')) {
    return '/';
  }
  return path;
}
