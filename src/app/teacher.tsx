import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getProfile, Profile } from '../lib/profile';
import { ago } from '../lib/format';
import Header from '../components/header';
import TabBar, { TabItem } from '../components/tab-bar';
import TeacherStudents from '../components/teacher-students';
import TeacherCourses from '../components/teacher-courses';
import TeacherMore from '../components/teacher-more';
import { Badge, Card } from '../components/ui';
import { colors, fonts } from '../lib/theme';

type Tab = 'dashboard' | 'students' | 'courses' | 'more';
const TABS: TabItem<Tab>[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'students', label: 'Students', icon: '👤' },
  { key: 'courses', label: 'My Courses', icon: '📋' },
  { key: 'more', label: 'More', icon: '☰' },
];

type Course = { id: string; code: string; name: string; status: string };
type Result = { percentage: number; student: { full_name: string } | null; quizzes: { title: string } | null };
type Act = { id: string; text: string; created_at: string };

export default function Teacher() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [students, setStudents] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [courses, setCourses] = useState<(Course & { rooms: number; students: number })[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [acts, setActs] = useState<Act[]>([]);
  const [error, setError] = useState('');

  async function load(p: Profile) {
    const rm = await supabase.from('rooms').select('id, course_id').eq('teacher_id', p.id);
    if (rm.error) return setError(rm.error.message);
    setError('');
    const rooms = rm.data || [];
    const roomIds = rooms.map((r: any) => r.id);
    setRoomCount(rooms.length);

    const cs = await supabase.from('courses').select('id, code, name, status').eq('teacher_id', p.id);
    const rs = roomIds.length
      ? await supabase.from('room_students').select('room_id, student_id').in('room_id', roomIds)
      : { data: [] as any[] };
    const rsData = (rs.data || []) as any[];
    setStudents(new Set(rsData.map((x) => x.student_id)).size);
    setCourses(
      ((cs.data || []) as Course[]).map((c) => {
        const ids = rooms.filter((r: any) => r.course_id === c.id).map((r: any) => r.id);
        return {
          ...c,
          rooms: ids.length,
          students: new Set(rsData.filter((x) => ids.includes(x.room_id)).map((x) => x.student_id)).size,
        };
      })
    );

    const qz = roomIds.length
      ? await supabase.from('quizzes').select('id').in('room_id', roomIds)
      : { data: [] as any[] };
    const quizIds = (qz.data || []).map((q: any) => q.id);
    setQuizCount(quizIds.length);

    if (quizIds.length) {
      const at = await supabase
        .from('attempts')
        .select('percentage, student:profiles!student_id(full_name), quizzes(title)')
        .in('quiz_id', quizIds)
        .order('submitted_at', { ascending: false })
        .limit(5);
      setResults((at.data || []) as unknown as Result[]);
    } else {
      setResults([]);
    }

    const ac = await supabase
      .from('activities')
      .select('id, text, created_at')
      .order('created_at', { ascending: false })
      .limit(6);
    setActs((ac.data || []) as Act[]);
  }

  useEffect(() => {
    getProfile()
      .then((p) => {
        if (!p || p.role !== 'teacher') return router.replace('/');
        setProfile(p);
        load(p);
      })
      .catch(() => router.replace('/'));
  }, []);

  useEffect(() => {
    if (tab === 'dashboard' && profile) load(profile);
  }, [tab]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (!profile) return <ActivityIndicator style={{ flex: 1 }} />;
  const name = profile.full_name || profile.email;

  const Stat = ({ label, value }: { label: string; value: number }) => (
    <Card style={s.stat}>
      <Text style={s.statL}>{label}</Text>
      <Text style={s.statV}>{value}</Text>
    </Card>
  );

  return (
    <View style={s.screen}>
      <Header role="teacher" name={name} onSignOut={signOut} />

      <View style={{ flex: 1 }}>
        {tab === 'dashboard' ? (
          <ScrollView contentContainerStyle={s.body}>
            <Text style={s.h1}>Dashboard</Text>
            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
            <View style={s.stats}>
              <Stat label="Total Students" value={students} />
              <Stat label="Total Quizzes" value={quizCount} />
              <Stat label="Total Rooms" value={roomCount} />
            </View>

            <Card style={{ gap: 4 }}>
              <Text style={s.cardTitle}>Course Overview</Text>
              {courses.length === 0 ? <Text style={s.empty}>No courses assigned yet</Text> : null}
              {courses.map((c, i) => (
                <View key={c.id} style={[s.row, i === courses.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.item}>
                      <Text style={{ fontFamily: fonts.semibold }}>{c.code}</Text> {c.name}
                    </Text>
                    <Text style={s.meta}>{c.rooms} room(s) · {c.students} student(s)</Text>
                  </View>
                  <Badge text={c.status} kind={c.status === 'active' ? 'ok' : 'bad'} />
                </View>
              ))}
            </Card>

            <Card style={{ gap: 4 }}>
              <Text style={s.cardTitle}>Recent Quiz Results</Text>
              {results.length === 0 ? <Text style={s.empty}>No submissions yet</Text> : null}
              {results.map((r, i) => (
                <View key={i} style={[s.row, i === results.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.item}>{r.student?.full_name || 'Student'}</Text>
                    <Text style={s.meta}>{r.quizzes?.title}</Text>
                  </View>
                  <Badge text={`${r.percentage}%`} kind={Number(r.percentage) >= 60 ? 'ok' : 'bad'} />
                </View>
              ))}
            </Card>

            <Card style={{ gap: 4 }}>
              <Text style={s.cardTitle}>Recent Activities</Text>
              {acts.length === 0 ? <Text style={s.empty}>Nothing yet</Text> : null}
              {acts.map((a, i) => (
                <View key={a.id} style={[s.row, i === acts.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={[s.item, { flex: 1 }]}>{a.text}</Text>
                  <Text style={s.meta}>{ago(a.created_at)}</Text>
                </View>
              ))}
            </Card>
          </ScrollView>
        ) : null}

        {tab === 'students' ? <TeacherStudents teacherId={profile.id} /> : null}
        {tab === 'courses' ? <TeacherCourses teacherId={profile.id} /> : null}
        {tab === 'more' ? <TeacherMore teacherId={profile.id} /> : null}
      </View>

      <TabBar role="teacher" items={TABS} value={tab} onChange={setTab} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 14, paddingBottom: 40 },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  stats: { gap: 12 },
  stat: { padding: 16, minHeight: 96 },
  statL: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  statV: { fontSize: 32, fontFamily: fonts.semibold, color: colors.text, marginTop: 6 },
  cardTitle: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  item: { fontSize: 13.5, fontFamily: fonts.regular, color: colors.text },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  empty: { fontFamily: fonts.regular, color: colors.muted, paddingVertical: 10 },
});