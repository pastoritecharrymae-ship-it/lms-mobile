import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Header from '../../components/header';
import ActivityFeed from '../../components/activity-feed';
import InviteModal from '../../components/invite-modal';
import { Badge, Button, Card } from '../../components/ui';
import { colors, fonts } from '../../lib/theme';

const PASS = 60;

type Room = {
  id: string; name: string; code: string; status: string;
  school_year: string | null; semester: string | null;
  course: { name: string } | null;
};
type Student = { student_id: string; profiles: { full_name: string; email: string } | null };
type Quiz = { id: string; title: string; status: string; question_count: number; total_points: number };
type Attempt = { quiz_id: string; student_id: string; percentage: number };

const BINS = [
  { label: '<60', test: (p: number) => p < 60 },
  { label: '60–69', test: (p: number) => p >= 60 && p < 70 },
  { label: '70–79', test: (p: number) => p >= 70 && p < 80 },
  { label: '80–89', test: (p: number) => p >= 80 && p < 90 },
  { label: '90–100', test: (p: number) => p >= 90 },
];

export default function TeacherRoom() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string; name?: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await supabase
      .from('rooms')
      .select('id, name, code, status, school_year, semester, course:courses(name)')
      .eq('id', id).single();
    if (r.error) return setError(r.error.message);
    setRoom(r.data as unknown as Room);

    const st = await supabase
      .from('room_students')
      .select('student_id, profiles!student_id(full_name, email)')
      .eq('room_id', id)
      .order('joined_at');
    if (st.error) return setError(st.error.message);
    setStudents(st.data as unknown as Student[]);

    const qz = await supabase
      .from('quizzes')
      .select('id, title, status, question_count, total_points')
      .eq('room_id', id)
      .order('created_at', { ascending: false });
    if (qz.error) return setError(qz.error.message);
    const ql = (qz.data || []) as Quiz[];
    setQuizzes(ql);

    if (ql.length) {
      const at = await supabase
        .from('attempts')
        .select('quiz_id, student_id, percentage')
        .in('quiz_id', ql.map((q) => q.id));
      setAttempts((at.data || []) as Attempt[]);
    } else setAttempts([]);
    setError('');
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function togglePublish(q: Quiz) {
    const next = q.status === 'published' ? 'draft' : 'published';
    if (next === 'published' && !q.question_count)
      return Alert.alert('No questions', 'Edit the quiz and add questions before publishing.');
    const { error } = await supabase.from('quizzes').update({ status: next }).eq('id', q.id);
    if (error) return Alert.alert('Could not update', error.message);
    setQuizzes((l) => l.map((x) => (x.id === q.id ? { ...x, status: next } : x)));
  }

  function removeStudent(st: Student) {
    const n = st.profiles?.full_name || 'this student';
    Alert.alert('Remove student', `Remove ${n} from this room?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('room_students').delete()
            .eq('room_id', id).eq('student_id', st.student_id);
          if (error) return Alert.alert('Error', error.message);
          load();
        },
      },
    ]);
  }

  if (!room && !error) return <ActivityIndicator style={{ flex: 1 }} />;

  const pcts = attempts.map((a) => Number(a.percentage));
  const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
  const passRate = pcts.length ? Math.round((pcts.filter((p) => p >= PASS).length / pcts.length) * 100) : 0;

  const rows = (students || []).map((st) => {
    const mine = attempts.filter((a) => a.student_id === st.student_id).map((a) => Number(a.percentage));
    return { st, taken: mine.length, avg: mine.length ? mine.reduce((a, b) => a + b, 0) / mine.length : null };
  });
  const top = rows.filter((r) => r.avg !== null).sort((a, b) => (b.avg || 0) - (a.avg || 0)).slice(0, 3);
  const dist = BINS.map((b) => ({ label: b.label, n: pcts.filter(b.test).length }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub: string }) => (
    <Card style={s.stat}>
      <Text style={s.statL}>{label}</Text>
      <Text style={s.statV}>{value}</Text>
      <Text style={s.statS}>{sub}</Text>
    </Card>
  );

  return (
    <View style={s.screen}>
      <Header role="teacher" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body}>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        {room ? (
          <View style={{ gap: 4 }}>
            <View style={s.titleRow}>
              <Text style={s.h1}>{room.name}</Text>
              <Badge text={room.status} kind={room.status === 'active' ? 'ok' : 'bad'} />
            </View>
            <Text style={s.meta}>
              {room.course?.name} · Room Code: {room.code}
              {room.school_year ? ` · ${room.school_year}` : ''}{room.semester ? ` · ${room.semester}` : ''}
            </Text>
          </View>
        ) : null}

        <Button
          title="👥 Invite Students" variant="default" style={{ alignSelf: 'flex-start' }}
          onPress={() => setInviteOpen(true)}
        />
        {room ? (
          <InviteModal
            visible={inviteOpen}
            onClose={() => setInviteOpen(false)}
            roomId={id}
            roomName={room.name}
            code={room.code}
            onAdded={load}
          />
        ) : null}

        <View style={s.statRow}>
          <Stat label="Students" value={students?.length ?? 0} sub="Enrolled Students" />
          <Stat label="Quizzes" value={quizzes.length} sub="Total Quizzes" />
        </View>
        <View style={s.statRow}>
          <Stat label="Average Score" value={`${Math.round(avg)}%`} sub="Room Average" />
          <Stat label="Pass Rate" value={`${passRate}%`} sub="Attempts that passed" />
        </View>

        <Card style={{ gap: 4 }}>
          <View style={s.titleRow}>
            <Text style={s.cardTitle}>Students</Text>
            <Text style={s.meta}>{students?.length ?? 0} enrolled</Text>
          </View>
          {students && students.length === 0 ? <Text style={s.empty}>No students have joined yet</Text> : null}
          {rows.map((r, i) => (
            <View key={r.st.student_id} style={[s.srow, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.num}>{i + 1}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.item}>{r.st.profiles?.full_name || 'Student'}</Text>
                <Text style={s.meta}>{r.st.profiles?.email}</Text>
                <Text style={s.meta}>
                  Quizzes taken: {r.taken} · Average: {r.avg === null ? '—' : `${Math.round(r.avg)}%`}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
                  {r.avg === null
                    ? <Badge text="No attempts" />
                    : <Badge text={r.avg >= PASS ? 'Passing' : 'Failing'} kind={r.avg >= PASS ? 'ok' : 'bad'} />}
                  <Pressable onPress={() => removeStudent(r.st)} hitSlop={8}>
                    <Text style={s.remove}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </Card>

        <Card style={{ gap: 10 }}>
          <View style={s.titleRow}>
            <Text style={s.cardTitle}>Recent Quizzes</Text>
            <Button small title="+ Add Quiz"
              onPress={() => router.push({ pathname: '/quiz-builder', params: { room_id: id } } as any)} />
          </View>
          {quizzes.length === 0 ? <Text style={s.empty}>No quizzes yet</Text> : null}
          {quizzes.map((q) => {
            const n = attempts.filter((a) => a.quiz_id === q.id).length;
            return (
              <View key={q.id} style={s.quiz}>
                <View style={s.titleRow}>
                  <Text style={[s.item, { flex: 1 }]}>{q.title}</Text>
                  <Badge text={q.status} kind={q.status === 'published' ? 'ok' : 'warn'} />
                </View>
                <Text style={s.meta}>
                  {q.question_count} questions · {q.total_points} pts · {n} of {students?.length ?? 0} submitted
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Button small style={{ flex: 1 }}
                    title={q.status === 'published' ? 'Unpublish' : 'Publish'}
                    variant={q.status === 'published' ? 'gray' : 'primary'}
                    onPress={() => togglePublish(q)} />
                  {n === 0 ? (
                    <Button small style={{ flex: 1 }} variant="default" title="Edit"
                      onPress={() => router.push({ pathname: '/quiz-builder', params: { id: q.id } } as any)} />
                  ) : null}
                  <Button small style={{ flex: 1 }} variant="default" title="Questions"
                    onPress={() => router.push({ pathname: '/quiz-questions/[id]', params: { id: q.id, title: q.title } } as any)} />
                </View>
              </View>
            );
          })}
        </Card>

        <Card style={{ gap: 6 }}>
          <Text style={s.cardTitle}>Score Distribution</Text>
          {dist.map((d) => (
            <View key={d.label} style={s.dist}>
              <Text style={s.dl}>{d.label}</Text>
              <View style={s.trk}>
                <View style={[s.fill, { width: `${(d.n / maxN) * 100}%` as any, backgroundColor: d.label === '<60' ? '#d05a5a' : '#2f7bd1' }]} />
              </View>
              <Text style={s.dn}>{d.n}</Text>
            </View>
          ))}
        </Card>

        <Card style={{ gap: 4 }}>
          <Text style={s.cardTitle}>Top Performers</Text>
          {top.length === 0 ? <Text style={s.empty}>No attempts yet</Text> : null}
          {top.map((r, i) => (
            <View key={r.st.student_id} style={[s.srow, i === top.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.num}>{i + 1}</Text>
              <Text style={[s.item, { flex: 1 }]}>{r.st.profiles?.full_name}</Text>
              <Badge text={`${Math.round(r.avg || 0)}%`} kind="ok" />
            </View>
          ))}
        </Card>

        <Text style={s.cardTitle}>Activity</Text>
        <ActivityFeed roomId={id} limit={10} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 14, paddingBottom: 50 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  h1: { flex: 1, fontSize: 26, fontFamily: fonts.semibold, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 14 },
  statL: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  statV: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text, marginTop: 4 },
  statS: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  cardTitle: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text },
  srow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  num: { width: 18, fontSize: 13.5, fontFamily: fonts.regular, color: colors.text },
  item: { fontSize: 14, fontFamily: fonts.medium, color: colors.text },
  remove: { fontSize: 13, fontFamily: fonts.medium, color: colors.danger },
  quiz: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, gap: 3 },
  dist: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dl: { width: 54, fontSize: 12.5, fontFamily: fonts.regular, color: colors.text },
  trk: { flex: 1, height: 16, backgroundColor: colors.soft, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%' },
  dn: { width: 20, fontSize: 12.5, fontFamily: fonts.medium, color: colors.text, textAlign: 'right' },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 10 },
});