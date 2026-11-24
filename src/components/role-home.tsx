import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getProfile, Profile } from '../lib/profile';

export default function RoleHome({ role }: { role: Profile['role'] }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile()
      .then((p) => {
        if (!p || p.role !== role) router.replace('/');
        else setProfile(p);
      })
      .catch(() => router.replace('/'));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (!profile) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={s.box}>
      <Text style={s.title}>{role.toUpperCase()} DASHBOARD</Text>
      <Text style={s.text}>Welcome, {profile.full_name || profile.email}</Text>
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '700' },
  text: { fontSize: 16, marginBottom: 12 },
});