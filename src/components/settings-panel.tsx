import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { Button, Card, Field } from './ui';
import { colors, fonts, roleColors } from '../lib/theme';

type Role = 'admin' | 'teacher' | 'student';
type Settings = { notify_quiz: boolean; notify_room: boolean; notify_email: boolean; theme: 'light' | 'dark' };
const DEFAULTS: Settings = { notify_quiz: true, notify_room: true, notify_email: false, theme: 'light' };

function Check({ on }: { on: boolean }) {
  return (
    <View style={[s.box, on && s.boxOn]}>
      {on ? <Text style={s.tick}>✓</Text> : null}
    </View>
  );
}

export default function SettingsPanel() {
  const [uid, setUid] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savedName, setSavedName] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [st, setSt] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, code, avatar_url, settings')
        .eq('id', user.id)
        .single();
      if (error) return Alert.alert('Error', error.message);
      setUid(data.id);
      setRole(data.role);
      setCode(data.code || '');
      setAvatar(data.avatar_url);
      setSavedName(data.full_name || '');
      setName(data.full_name || '');
      setSavedEmail(data.email || '');
      setEmail(data.email || '');
      setSt({ ...DEFAULTS, ...(data.settings || {}) });
    })();
  }, []);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (res.canceled || !res.assets?.length) return;
    setUploading(true);
    try {
      const buf = await (await fetch(res.assets[0].uri)).arrayBuffer();
      const path = `${uid}/avatar.jpg`;
      const up = await supabase.storage.from('avatars').upload(path, buf, { contentType: 'image/jpeg', upsert: true });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      const u = await supabase.from('profiles').update({ avatar_url: url }).eq('id', uid);
      if (u.error) throw u.error;
      setAvatar(url);
    } catch (e: any) {
      Alert.alert('Could not upload', e.message || String(e));
    }
    setUploading(false);
  }

  async function save(patch: Partial<Settings>) {
    if (!st) return;
    const next = { ...st, ...patch };
    setSt(next);
    const { error } = await supabase.from('profiles').update({ settings: next }).eq('id', uid);
    if (error) Alert.alert('Could not save', error.message);
  }

  async function saveProfile() {
    if (!name.trim()) return Alert.alert('Missing', 'Enter your full name');
    if (!email.trim()) return Alert.alert('Missing', 'Enter your email address');
    setSaving(true);
    try {
      const emailChanged = email.trim().toLowerCase() !== savedEmail.toLowerCase();
      if (emailChanged) {
        const a = await supabase.auth.updateUser({ email: email.trim() });
        if (a.error) throw a.error;
      }
      const u = await supabase
        .from('profiles')
        .update({ full_name: name.trim(), email: email.trim() })
        .eq('id', uid);
      if (u.error) throw u.error;
      setSavedName(name.trim());
      setSavedEmail(email.trim());
      Alert.alert(
        'Saved',
        emailChanged ? 'Profile updated. Check your inbox if a confirmation email was sent.' : 'Your profile was updated.'
      );
    } catch (e: any) {
      Alert.alert('Could not save', e.message || String(e));
    }
    setSaving(false);
  }

  async function updatePassword() {
    if (pw.length < 8) return Alert.alert('Too short', 'Password must be at least 8 characters');
    if (pw !== pw2) return Alert.alert('Mismatch', 'Passwords do not match');
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (error) return Alert.alert('Could not update', error.message);
    setPw(''); setPw2('');
    Alert.alert('Done', 'Password updated');
  }

  if (!st) return <ActivityIndicator style={{ flex: 1 }} />;

  const initial = (savedName || savedEmail).trim().charAt(0).toUpperCase();
  const roleName = role[0].toUpperCase() + role.slice(1);
  const rows: { label: string; k: 'notify_quiz' | 'notify_room' | 'notify_email' }[] = [
    { label: 'Quiz notifications', k: 'notify_quiz' },
    { label: 'Room notifications', k: 'notify_room' },
    { label: 'Email notifications', k: 'notify_email' },
  ];

  return (
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Settings</Text>

      <Card style={{ gap: 14 }}>
        <View>
          <Text style={s.cardTitle}>Profile Settings</Text>
          <Text style={s.sub}>Update your personal information and profile details</Text>
        </View>

        <View style={s.photoRow}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, { backgroundColor: roleColors[role].avatar }]}>
              <Text style={s.initial}>{initial}</Text>
            </View>
          )}
          <Pressable style={s.changeBtn} onPress={pickPhoto} disabled={uploading}>
            <Text style={s.changeT}>{uploading ? 'Uploading...' : 'Change Profile'}</Text>
          </Pressable>
        </View>

        <Field label="Full Name" value={name} onChangeText={setName} />
        <Field label="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

        <View style={{ gap: 6 }}>
          <Text style={s.label}>{roleName} ID</Text>
          <View style={s.ro}>
            <Text style={s.roText}>{code || '—'}</Text>
            <Text style={s.roNote}>(Not Editable)</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={saving ? 'Saving...' : 'Save Changes'} onPress={saveProfile} disabled={saving} />
          <Button title="Cancel" variant="gray" onPress={() => { setName(savedName); setEmail(savedEmail); }} />
        </View>
      </Card>

      <Card>
        <Text style={s.cardTitle}>Notification Settings</Text>
        {rows.map((r, i) => (
          <Pressable
            key={r.k}
            onPress={() => save({ [r.k]: !st[r.k] })}
            style={[s.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={s.text}>{r.label}</Text>
            <Check on={st[r.k]} />
          </Pressable>
        ))}
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={s.cardTitle}>Appearance</Text>
        {(['light', 'dark'] as const).map((t) => (
          <Pressable key={t} onPress={() => save({ theme: t })} style={[s.theme, st.theme === t && s.themeOn]}>
            <Text style={s.themeT}>{t === 'light' ? 'Light' : 'Dark'}</Text>
          </Pressable>
        ))}
        <Text style={s.note}>Your choice is saved to your account. The mobile app stays light for now.</Text>
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={s.cardTitle}>Change Password</Text>
        <Field label="New password" password value={pw} onChangeText={setPw} />
        <Field label="Confirm password" password value={pw2} onChangeText={setPw2} />
        <Button title={pwBusy ? 'Updating...' : 'Update password'} onPress={updatePassword} disabled={pwBusy} style={{ alignSelf: 'flex-start' }} />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  body: { padding: 18, gap: 14, paddingBottom: 40 },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  cardTitle: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text },
  sub: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  label: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.text },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { color: '#fff', fontSize: 30, fontFamily: fonts.bold },
  changeBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.card },
  changeT: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  ro: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: '#f3f5f9',
  },
  roText: { fontSize: 14, fontFamily: fonts.regular, color: colors.muted },
  roNote: { fontSize: 11.5, fontFamily: fonts.regular, color: colors.muted },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  text: { fontSize: 14.5, fontFamily: fonts.regular, color: colors.text },
  box: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#767676',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  boxOn: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  tick: { color: '#fff', fontSize: 14, fontFamily: fonts.bold, lineHeight: 16 },
  theme: {
    alignSelf: 'center', width: '75%', paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.card,
  },
  themeOn: { borderColor: colors.primary, borderWidth: 2 },
  themeT: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  note: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, textAlign: 'center' },
});