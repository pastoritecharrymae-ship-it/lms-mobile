import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Modal, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Badge, Button, Card, Field, Tabs } from './ui';
import { colors, fonts } from '../lib/theme';

type User = {
  id: string; code: string | null; full_name: string; email: string;
  role: 'admin' | 'teacher' | 'student'; status: 'active' | 'inactive';
};
type Filter = 'all' | 'student' | 'teacher' | 'admin';
type Role = 'student' | 'teacher' | 'admin';

async function callFn(body: any) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function UsersAdmin({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<null | { kind: 'add' } | { kind: 'reset'; user: User }>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ code: '', full_name: '', email: '', role: 'student' as Role, password: '', confirm: '' });

  async function load() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, code, full_name, email, role, status')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else { setError(''); setUsers(data as User[]); }
  }
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users || []).filter(
      (u) =>
        (filter === 'all' || u.role === filter) &&
        (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) ||
          (u.code || '').toLowerCase().includes(q))
    );
  }, [users, filter, search]);

  async function toggle(u: User) {
    if (u.id === selfId) return Alert.alert('Not allowed', 'You cannot deactivate yourself');
    const { error } = await supabase
      .from('profiles')
      .update({ status: u.status === 'active' ? 'inactive' : 'active' })
      .eq('id', u.id);
    if (error) return Alert.alert('Error', error.message);
    load();
  }

  function remove(u: User) {
    Alert.alert('Delete user', `Permanently delete ${u.full_name || u.email}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await callFn({ action: 'delete', id: u.id }); load(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }

  async function submit() {
    if (!modal) return;
    setBusy(true);
    try {
      if (modal.kind === 'reset') {
        if (f.password.length < 8) throw new Error('Password must be at least 8 characters');
        await callFn({ action: 'reset_password', id: modal.user.id, password: f.password });
        Alert.alert('Done', 'Password updated');
      } else {
        if (f.password !== f.confirm) throw new Error('Passwords do not match');
        if (f.password.length < 8) throw new Error('Password must be at least 8 characters');
        await callFn({
          action: 'create', code: f.code.trim().toUpperCase(), full_name: f.full_name,
          email: f.email.trim(), role: f.role, password: f.password,
        });
        Alert.alert('Account created', `Email: ${f.email}`);
      }
      setModal(null);
      setF({ code: '', full_name: '', email: '', role: 'student', password: '', confirm: '' });
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setBusy(false);
  }

  return (
    <View style={s.body}>
      <View style={s.head}>
        <Text style={s.h1}>Users</Text>
        <Button small title="+ Add user" onPress={() => setModal({ kind: 'add' })} />
      </View>
      <Field placeholder="Search users..." autoCapitalize="none" value={search} onChangeText={setSearch} />
      <Tabs<Filter>
        value={filter} onChange={setFilter}
        items={[
          { key: 'all', label: 'All' }, { key: 'student', label: 'Student' },
          { key: 'teacher', label: 'Teacher' }, { key: 'admin', label: 'Admin' },
        ]}
      />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!users && !error ? <ActivityIndicator /> : null}
      <Text style={s.meta}>{shown.length} user(s)</Text>

      <FlatList
        data={shown} keyExtractor={(u) => u.id} style={{ flex: 1 }}
        contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
        renderItem={({ item: u }) => (
          <Card style={{ padding: 14, gap: 4 }}>
            <View style={s.row}>
              <Text style={[s.name, { flex: 1 }]}>{u.full_name || u.email}</Text>
              <Badge text={u.status} kind={u.status === 'active' ? 'ok' : 'bad'} />
            </View>
            <Text style={s.meta}>{u.email}</Text>
            <Text style={[s.meta, { textTransform: 'capitalize' }]}>{u.role}{u.code ? ` · ${u.code}` : ''}</Text>
            <View style={s.actions}>
              <Pressable onPress={() => toggle(u)}>
                <Text style={s.link}>{u.status === 'active' ? 'Deactivate' : 'Activate'}</Text>
              </Pressable>
              <Pressable onPress={() => { setF({ ...f, password: '' }); setModal({ kind: 'reset', user: u }); }}>
                <Text style={s.link}>Reset password</Text>
              </Pressable>
              {u.id !== selfId ? (
                <Pressable onPress={() => remove(u)}>
                  <Text style={[s.link, { color: colors.danger }]}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        )}
      />

      <Modal transparent visible={!!modal} animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.mTitle}>
              {modal?.kind === 'reset' ? `Reset password · ${modal.user.full_name}` : 'Add New User'}
            </Text>
            {modal?.kind === 'add' ? (
              <>
                <Field label="User ID" placeholder="e.g. STD 003" autoCapitalize="characters" value={f.code} onChangeText={(v) => setF({ ...f, code: v })} />
                <Field label="Full Name" value={f.full_name} onChangeText={(v) => setF({ ...f, full_name: v })} />
                <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} />
                <Tabs<Role>
                  value={f.role} onChange={(v) => setF({ ...f, role: v })}
                  items={[{ key: 'student', label: 'Student' }, { key: 'teacher', label: 'Teacher' }, { key: 'admin', label: 'Admin' }]}
                />
              </>
            ) : null}
            <Field label="Password" password value={f.password} onChangeText={(v) => setF({ ...f, password: v })} />
            {modal?.kind === 'add' ? (
              <Field label="Confirm Password" password value={f.confirm} onChangeText={(v) => setF({ ...f, confirm: v })} />
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Cancel" variant="gray" style={{ flex: 1 }} onPress={() => setModal(null)} />
              <Button title={busy ? '...' : modal?.kind === 'reset' ? 'Reset' : 'Create'} style={{ flex: 1 }} onPress={submit} disabled={busy} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, padding: 18, gap: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  actions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  link: { fontSize: 13, fontFamily: fonts.medium, color: colors.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(10,20,40,0.5)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: colors.card, borderRadius: 12, padding: 20, gap: 12 },
  mTitle: { fontSize: 18, fontFamily: fonts.semibold, color: colors.text },
});