import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { AppIcon } from '@/src/components/AppIcon';
import { fontFamily } from '@/src/theme/typography';
import { t } from '@/src/i18n';

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathname.includes('/library') ? 'library' : 'home';

  const jump = (target: 'home' | 'library') => {
    if (target === active) return;
    router.replace(target === 'home' ? '/(tabs)' : '/(tabs)/library');
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={() => jump('home')}>
        <AppIcon name="home" size={26} color={active === 'home' ? '#065f46' : '#a1a1aa'} />
        <Text style={[styles.label, active === 'home' ? styles.labelActive : null]}>HOME</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={() => jump('library')}>
        <AppIcon name="bookmarks" size={26} color={active === 'library' ? '#065f46' : '#a1a1aa'} />
        <Text style={[styles.label, active === 'library' ? styles.labelActive : null]}>{t('nav.library').toUpperCase()}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'rgba(255,255,255,0.72)',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    height: 88,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 104,
  },
  label: {
    fontSize: 10,
    color: '#a1a1aa',
    fontFamily: fontFamily.mono,
    letterSpacing: 1.8,
    lineHeight: 12,
  },
  labelActive: {
    color: '#065f46',
  },
});
