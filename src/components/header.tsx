import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { fonts, roleColors } from '../lib/theme';
import Logo from './logo';
import NotificationBell from './notification-bell';

export default function Header({
  role, name, onSignOut, onBack,
}: {
  role: 'admin' | 'teacher' | 'student';
  name?: string;
  onSignOut?: () => void;
  onBack?: () => void;
}) {
  const router = useRouter();
  const c = roleColors[role];
  return (
    <View style={[s.bar, { backgroundColor: c.side }]}>
      {onBack ? (
        <Pressable onPress={onBack}>
          <Text style={s.link}>← Back</Text>
        </Pressable>
      ) : (
        <View style={s.brandRow}>
          <Logo />
          <Text style={s.brand}>LMS</Text>
        </View>
      )}
      <View style={s.right}>
        {name ? <NotificationBell /> : null}
        {onSignOut ? (
          <Pressable onPress={onSignOut}>
            <Text style={s.link}>Logout</Text>
          </Pressable>
        ) : null}
        {name ? (
          <Pressable onPress={() => router.push('/profile' as any)} hitSlop={6}>
            <View style={[s.avatar, { backgroundColor: c.avatar }]}>
              <Text style={s.initial}>{name.trim().charAt(0).toUpperCase()}</Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    paddingTop: 48, paddingBottom: 14, paddingHorizontal: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { color: '#fff', fontSize: 24, fontFamily: fonts.bold },
  right: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  link: { color: '#fff', fontSize: 13.5, fontFamily: fonts.medium },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontFamily: fonts.semibold, fontSize: 16 },
});