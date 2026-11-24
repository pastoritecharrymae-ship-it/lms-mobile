import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getProfile } from '../lib/profile';
import { colors, fonts } from '../lib/theme';
import { Button, Field, AlertBox } from '../components/ui';
import LoginArt from '../components/login-art';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [kb, setKb] = useState(false);

  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setKb(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  async function goToRole() {
    const p = await getProfile();
    if (!p) return setLoading(false);
    if (p.status !== 'active') {
      await supabase.auth.signOut();
      setLoading(false);
      return setError('Your account is inactive. Please contact your administrator.');
    }
    router.replace(('/' + p.role) as any);
  }

  useEffect(() => {
    goToRole().catch(() => setLoading(false));
  }, []);

  async function signIn() {
    Keyboard.dismiss();
    setError('');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    try {
      await goToRole();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={[s.hero, kb && { paddingTop: 36, paddingBottom: 16, flex: 0 }]}>
          <Text style={s.welcome}>Welcome to</Text>
          <Text style={s.lms}>LMS</Text>
          {!kb ? (
            <View style={s.art}>
              <LoginArt />
            </View>
          ) : null}
          {!kb ? <Text style={s.tag}>Learning Management System</Text> : null}
        </View>

        <View style={s.card}>
          <Text style={s.title}>Login to your account</Text>
          {error ? <AlertBox text={error} /> : null}
          <Field
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field label="Password" password value={password} onChangeText={setPassword} />
          <Button title={busy ? 'Logging in...' : 'Log in'} onPress={signIn} disabled={busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: {
    flex: 1, backgroundColor: colors.brandDark, alignItems: 'center',
    paddingTop: 48, paddingBottom: 18,
  },
  welcome: { color: '#fff', fontSize: 16, fontFamily: fonts.regular },
  lms: { color: '#fff', fontSize: 44, fontFamily: fonts.bold, lineHeight: 50 },
  art: { flex: 1, width: '80%', minHeight: 110, marginVertical: 10 },
  tag: { color: '#fff', fontSize: 14, fontFamily: fonts.regular },
  card: {
    margin: 16, padding: 18, gap: 12, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, backgroundColor: colors.card,
  },
  title: {
    fontSize: 19, fontFamily: fonts.semibold, color: colors.loginTitle,
    textAlign: 'center', marginBottom: 2,
  },
});