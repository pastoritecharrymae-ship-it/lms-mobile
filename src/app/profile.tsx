import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import Header from '../components/header';
import { Button } from '../components/ui';
import { colors, fonts, roleColors } from '../lib/theme';

type P = {
  full_name: string; email: string; role: 'admin' | 'teacher' | 'student';
  code: string | null; avatar_url: string | null; created_at: string;
};

export default function Profile() {
  const router = useRouter();
  const [p, setP] = useState<P | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/');
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, role, code, avatar_url, created_at')
        .eq('id', user.id)
        .single();
      setP(data as P);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (!p) return <ActivityIndicator style={{ flex: 1 }} />;

  const c = roleColors[p.role];
  const initial = (p.full_name || p.email).trim().charAt(0).toUpperCase();
  const roleName = p.role[0].toUpperCase() + p.role.slice(1);
  const joined = new Date(p.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const rows: [string, string][] = [
    ['Full Name:', p.full_name || '—'],
    ['Email:', p.email],
    [`${roleName} ID:`, p.code || '—'],
    ['Date Joined:', joined],
  ];

  return (
    <View style={s.screen}>
      <Header role={p.role} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.h1}>Profile</Text>

        {p.avatar_url ? (
          <Image source={{ uri: p.avatar_url }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, { backgroundColor: c.avatar }]}>
            <Text style={s.initial}>{initial}</Text>
          </View>
        )}

        <View style={s.card}>
          {rows.map(([k, v], i) => (
            <View key={k} style={[s.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.v}><Text style={s.k}>{k}</Text>  {v}</Text>
            </View>
          ))}
        </View>

        <Button title="Logout" variant="danger" onPress={signOut} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 18, paddingBottom: 40 },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  avatar: {
    width: 200, height: 200, borderRadius: 100, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginVertical: 8,
  },
  initial: { color: '#fff', fontSize: 100, fontFamily: fonts.bold },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  row: { paddingVertical: 18, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  k: { fontFamily: fonts.bold, color: colors.text },
  v: { fontSize: 14, fontFamily: fonts.regular, color: colors.text },
});