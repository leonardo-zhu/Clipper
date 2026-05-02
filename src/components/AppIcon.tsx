import { Ionicons, MaterialIcons } from '@expo/vector-icons';

type IonIconName =
  | 'add'
  | 'home-outline'
  | 'book-outline'
  | 'bookmark-outline'
  | 'add-circle-outline'
  | 'arrow-forward'
  | 'funnel-outline'
  | 'sync-outline'
  | 'download-outline'
  | 'trash-outline'
  | 'image-outline';

type MaterialIconName = 'bookmarks' | 'sort' | 'folder-open' | 'science' | 'menu-book';
type IconSpec =
  | { set: 'ion'; name: IonIconName }
  | { set: 'material'; name: MaterialIconName };

const iconMap: Record<string, IconSpec> = {
  add: { set: 'ion', name: 'add' },
  home: { set: 'ion', name: 'home-outline' },
  auto_stories: { set: 'ion', name: 'book-outline' },
  bookmarks: { set: 'material', name: 'bookmarks' },
  add_circle: { set: 'ion', name: 'add-circle-outline' },
  arrow_forward: { set: 'ion', name: 'arrow-forward' },
  sort: { set: 'material', name: 'sort' },
  folder_open: { set: 'material', name: 'folder-open' },
  science: { set: 'material', name: 'science' },
  menu_book: { set: 'material', name: 'menu-book' },
  delete: { set: 'ion', name: 'trash-outline' },
  sync_saved_locally: { set: 'ion', name: 'sync-outline' },
  download: { set: 'ion', name: 'download-outline' },
  image: { set: 'ion', name: 'image-outline' },
  book: { set: 'ion', name: 'book-outline' },
};

export function AppIcon({ name, size = 24, color = '#1a1c1b' }: { name: string; size?: number; color?: string }) {
  const spec = iconMap[name] ?? { set: 'ion', name: 'book-outline' as IonIconName };
  if (spec.set === 'material') {
    return <MaterialIcons name={spec.name} size={size} color={color} />;
  }
  return <Ionicons name={spec.name} size={size} color={color} />;
}
