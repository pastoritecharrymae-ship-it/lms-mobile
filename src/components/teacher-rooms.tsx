import { useCallback, useState } from 'react';
import { View, Text, FlatList, Modal, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Badge, Button, Card, Field } from './ui';
import { colors, fonts, radius } from '../lib/theme';

type Room = {
  id: string; name: string; section: string | null; school_year: string | null;
  semester: string | null; code: string; status: string; created_at: string;
  course: { name: string } | null;
  room_students: { count: number }[];
  quizzes: { count: number }[];
};
type Course = { id: string; code: string; name: string };

const SEMESTERS = ['Semester 1', 'Semester 2'];
const year = new Date().getFullYear();
const blank = () => ({
  name: '', course_id: '', section: '', description: '',
  school_year: `${year}-${year + 1}`, semester: 'Semester 1',
});

export default function TeacherRooms({ teacherId }: { teacherId: string }) {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank());
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, section, school_year, semester, code, status, created_at, course:courses(name), room_students(count), quizzes(count)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else { setError(''); setRooms((data || []) as unknown as Room[]); }
  }

  useFocusEffect(useCallback(() => { load(); }, [teacherId]));

  async function openCreate() {
    const { data, error } = await supabase
      .from('courses').select('id, code, name')
      .eq('teacher_id', teacherId).eq('status', 'active').order('code');
    if (error) return Alert.alert('Error', error.message);
    if (!data?.length)
      return Alert.alert('No courses', 'You have no active courses assigned. Ask an administrator to assign one.');
    setCourses(data as Course[]);
    setF({ ...blank(), course_id: data[0].id });
    setOpen(true);
  }

  async function create() {
    if (!f.name.trim()) return Alert.alert('Missing', 'Enter a room name');
    setBusy(true);
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name: f.name.trim(), course_id: f.course_id, section: f.section || null,
        description: f.description || null, school_year: f.school_year || null,
        semester: f.semester || null, teacher_id: teacherId,
      })
      .select('id, code').single();
    setBusy(false);
    if (error) return Alert.alert('Error', error.message);
    setOpen(false);
    setCreated(data.code);
    load();
  }

  function remove(r: Room) {
    Alert.alert('Delete room', `Delete “${r.name}” including its quizzes and results?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('rooms').delete().eq('id', r.id);
          if (error) return Alert.alert('Error', error.message);
          load();
        },
      },
    ]);
  }

  const totalStudents = (rooms || []).reduce((a, r) => a + (r.room_students[0]?.count || 0), 0);
  const totalQuizzes = (rooms || []).reduce((a, r) => a + (r.quizzes[0]?.count || 0), 0);

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <View style={s.head}>
        <Text style={s.h1}>Rooms</Text>
        <Button small title="+ Create Room" onPress={openCreate} />
      </View>

      <View style={s.stats}>
        <Card style={s.stat}><Text style={s.statL}>Students</Text><Text style={s.statV}>{totalStudents}</Text></Card>
        <Card style={s.stat}><Text style={s.statL}>Quizzes</Text><Text style={s.statV}>{totalQuizzes}</Text></Card>
        <Card style={s.stat}><Text style={s.statL}>Rooms</Text><Text style={s.statV}>{rooms?.length ?? 0}</Text></Card>
      </View>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!rooms && !error ? <ActivityIndicator /> : null}
      {rooms && rooms.length === 0 ? <Text style={s.empty}>No rooms yet. Create your first room.</Text> : null}

      <FlatList
        data={rooms || []} keyExtractor={(r) => r.id} style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
            onPress={() => router.push({ pathname: '/teacher-room/[id]', params: { id: item.id, name: item.name } } as any)}
          >
            <Text style={s.course}>{item.course?.name || 'No course'}</Text>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.meta}>{[item.section, item.school_year, item.semester].filter(Boolean).join(' · ')}</Text>
            <Text style={s.meta}>
              {item.room_students[0]?.count || 0} student(s) · {item.quizzes[0]?.count || 0} quiz(zes) · Created {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <View style={s.row}>
              <View style={s.codebox}><Text style={s.code}>{item.code}</Text></View>
              <Badge text={item.status} kind={item.status === 'active' ? 'ok' : 'bad'} />
            </View>
            <Pressable onPress={() => remove(item)} hitSlop={8}>
              <Text style={s.del}>Delete</Text>
            </Pressable>
          </Pressable>
        )}
      />

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Text style={s.mTitle}>Create New Room</Text>
              <Field label="Room Name" placeholder="e.g. BSIT - 1A Programming" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
              <Text style={s.label}>Course</Text>
              <View style={s.chips}>
                {courses.map((c) => (
                  <Pressable key={c.id} onPress={() => setF({ ...f, course_id: c.id })} style={[s.chip, f.course_id === c.id && s.chipOn]}>
                    <Text style={[s.chipT, f.course_id === c.id && { color: '#fff' }]}>{c.code} - {c.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Section" placeholder="e.g. 1A" value={f.section} onChangeText={(v) => setF({ ...f, section: v })} />
              <Field label="Description" multiline value={f.description} onChangeText={(v) => setF({ ...f, description: v })} />
              <Field label="School Year" value={f.school_year} onChangeText={(v) => setF({ ...f, school_year: v })} />
              <Text style={s.label}>Semester</Text>
              <View style={s.chips}>
                {SEMESTERS.map((m) => (
                  <Pressable key={m} onPress={() => setF({ ...f, semester: m })} style={[s.chip, f.semester === m && s.chipOn]}>
                    <Text style={[s.chipT, f.semester === m && { color: '#fff' }]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Cancel" variant="gray" style={{ flex: 1 }} onPress={() => setOpen(false)} />
                <Button title={busy ? '...' : 'Create Room'} style={{ flex: 1 }} onPress={create} disabled={busy} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={!!created} animationType="fade" onRequestClose={() => setCreated(null)}>
        <View style={s.overlay}>
          <View style={[s.modal, { alignItems: 'center', gap: 10 }]}>
            <Text style={s.mTitle}>Room Created Successfully!</Text>
            <Text style={s.meta}>Share this code with your students so they can join.</Text>
            <View style={[s.codebox, { paddingVertical: 14, paddingHorizontal: 22 }]}>
              <Text style={[s.code, { fontSize: 28 }]} selectable>{created}</Text>
            </View>
            <Button title="OK" style={{ alignSelf: 'stretch' }} onPress={() => setCreated(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 12 },
  statL: { fontSize: 12, fontFamily: fonts.semibold, color: colors.text },
  statV: { fontSize: 24, fontFamily: fonts.semibold, color: colors.text, marginTop: 2 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16 },
  course: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  name: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text, marginTop: 2 },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  codebox: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  code: { fontSize: 16, fontFamily: fonts.bold, letterSpacing: 3, color: colors.text },
  del: { fontSize: 13, fontFamily: fonts.medium, color: colors.danger, marginTop: 10 },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(10,20,40,0.5)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: colors.card, borderRadius: 12, padding: 20, maxHeight: '90%' },
  mTitle: { fontSize: 18, fontFamily: fonts.semibold, color: colors.text },
  label: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipT: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.text },
});