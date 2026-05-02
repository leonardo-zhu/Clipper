import { Ionicons } from '@expo/vector-icons';

type IconName =
  | 'add'
  | 'book-outline'
  | 'bookmark-outline'
  | 'add-circle-outline'
  | 'arrow-forward'
  | 'sync-outline'
  | 'download-outline'
  | 'image-outline';

const iconMap: Record<string, IconName> = {
  add: 'add',
  auto_stories: 'book-outline',
  bookmarks: 'bookmark-outline',
  add_circle: 'add-circle-outline',
  arrow_forward: 'arrow-forward',
  sync_saved_locally: 'sync-outline',
  download: 'download-outline',
  image: 'image-outline',
  book: 'book-outline',
};

export function AppIcon({ name, size = 24, color = '#1a1c1b' }: { name: string; size?: number; color?: string }) {
  return <Ionicons name={iconMap[name] ?? 'book-outline'} size={size} color={color} />;
}
