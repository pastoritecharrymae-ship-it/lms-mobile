import { useEffect, useState } from 'react';
import { View, Text, FlatList, Modal, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Badge, Button, Card, Field, Tabs } from './ui';
import { colors, fonts } from '../lib/theme';

type Course = {
  id: string; code: string; name: string; description: string | null; status: 'active' | 'inactive';
  teacher_id: string | null; profiles: { full_name: string } | null;
};
type Teacher = { id: string; full_name: string };
const EMPTY = { id: '', code: '', name: '', description: '', teacher_id: '' as string, status: 'active' as 'active' | 'inactive' };

export default function CoursesList() {
  const [list, setList] = useState<Course[] | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from('courses')
      .select('id, code, name, description, status, teacher_id, profiles(full_name)')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else { setError(''); setList((data || []) as unknown as Course[]); }
  }
  useEffect(() => {
    load();
    supabase.from('profiles').select('id, full_name').eq('role', 'teacher').eq('status', 'active').order('full_name')
      .then(({ data }) => setTeachers((data || []) as Teacher[]));
  }, []);

  function edit(c: Course | null) {
    setF(c ? { id: c.id, code: c.code, name: c.name, description: c.description || '', teacher_id: c.teacher_id || '', status: c.status } : EMPTY);
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    const row = {
      code: f.code.trim(), name: f.name.trim(), description: f.description || null,
      teacher_id: f.teacher_id || null, status: f.status,
    };
    const { error } = f.id
      ? await supabase.from('courses').update(row).eq('id', f.id)
      : await supabase.from('courses').insert(row);
    setBusy(false);
    if (error) return Alert.alert('Error', error.code === '23505' ? 'A course with that ID already exists' : error.message);
    setOpen(false);
    load();
  }

  async function toggle(c: Course) {
    const { error } = await supabase.from('courses').update({ status: c.status === 'active' ? 'inactive' : 'active' }).eq('id', c.id);
    if (error) return Alert.alert('Error', error.message);
    load();
  }

  function remove(c: Course) {
    Alert.alert('Delete course', `Delete “${c.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('courses').delete().eq('id', c.id);
          if (error)
            return Alert.alert(
              'Error',
              error.code === '23503' ? 'This course still has rooms. Delete the rooms first or deactivate the course.' : error.message
            );
          load();
        },
      },
    ]);
  }

  return (
    <View style={s.body}>
      <View style={s.head}>
        <Text style={s.h1}>Courses</Text>
        <Button small title="+ Add course" onPress={() => edit(null)} />
      </View>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!list && !error ? <ActivityIndicator /> : null}
      {list && list.length === 0 ? <Text style={s.empty}>No courses found</Text> : null}

      <FlatList
        data={list || []} keyExtractor={(c) => c.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
        renderItem={({ item: c }) => (
          <Card style={{ padding: 14, gap: 3 }}>
            <View style={s.row}>
              <Text style={s.name}><Text style={{ fontFamily: fonts.bold }}>{c.code}</Text> {c.name}</Text>
              <Badge text={c.status} kind={c.status === 'active' ? 'ok' : 'bad'} />
            </View>
            {c.description ? <Text style={s.meta}>{c.description}</Text> : null}
            <Text style={s.meta}>Teacher: {c.profiles?.full_name || '—'}</Text>
            <View style={s.actions}>
              <Pressable onPress={() => edit(c)}><Text style={s.link}>Edit</Text></Pressable>
              <Pressable onPress={() => toggle(c)}>
                <Text style={s.link}>{c.status === 'active' ? 'Deactivate' : 'Activate'}</Text>
              </Pressable>
              <Pressable onPress={() => remove(c)}><Text style={[s.link, { color: colors.danger }]}>Delete</Text></Pressable>
            </View>
          </Card>
        )}
      />

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.mTitle}>{f.id ? 'Edit Course' : 'Add New Course'}</Text>
            <Field label="Course ID" placeholder="e.g. IT 101" value={f.code} onChangeText={(v) => setF({ ...f, code: v })} />
            <Field label="Course Name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
            <Field label="Description" multiline value={f.description} onChangeText={(v) => setF({ ...f, description: v })} />
            <Text style={s.label}>Teacher / Instructor</Text>
            <View style={s.chips}>
              {[{ id: '', full_name: 'Unassigned' }, ...teachers].map((t) => (
                <Pressable key={t.id || 'none'} onPress={() => setF({ ...f, teacher_id: t.id })}
                  style={[s.chip, f.teacher_id === t.id && s.chipOn]}>
                  <Text style={{ fontSize: 12.5, fontFamily: fonts.regular, color: f.teacher_id === t.id ? '#fff' : colors.text }}>
                    {t.full_name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Tabs<'active' | 'inactive'>
              value={f.status} onChange={(v) => setF({ ...f, status: v })}
              items={[{ key: 'active', label: 'Active' }, { key: 'inactive', label: 'Inactive' }]}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Cancel" variant="gray" style={{ flex: 1 }} onPress={() => setOpen(false)} />
              <Button title={busy ? '...' : f.id ? 'Save course' : 'Add course'} style={{ flex: 1 }} onPress={save} disabled={busy} />
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  actions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  link: { fontSize: 13, fontFamily: fonts.medium, color: colors.primary },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(10,20,40,0.5)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: colors.card, borderRadius: 12, padding: 20, gap: 12 },
  mTitle: { fontSize: 18, fontFamily: fonts.semibold, color: colors.text },
  label: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});