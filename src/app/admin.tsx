import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, G } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { getProfile, Profile } from '../lib/profile';
import { ago } from '../lib/format';
import Header from '../components/header';
import TabBar, { TabItem } from '../components/tab-bar';
import CoursesList from '../components/courses-list';
import UsersAdmin from '../components/users-admin';
import RoomsAdmin from '../components/rooms-admin';
import AdminMore from '../components/admin-more';
import { Badge, Card } from '../components/ui';
import { colors, fonts } from '../lib/theme';

type Tab = 'dashboard' | 'users' | 'courses' | 'rooms' | 'more';
const TABS: TabItem<Tab>[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'users', label: 'Users', icon: '👤' },
  { key: 'courses', label: 'Courses', icon: '📋' },
  { key: 'rooms', label: 'Rooms', icon: '🏫' },
  { key: 'more', label: 'More', icon: '☰' },
];

type User = {
  id: string; code: string | null; full_name: string; email: string;
  role: 'admin' | 'teacher' | 'student'; status: 'active' | 'inactive';
};
type Act = { id: string; text: string; created_at: string };
type RQuiz = { id: string; title: string; status: string; rooms: { name: string } | null };

const SEG = [
  { key: 'admin', label: 'Admins', color: '#2f7bd1' },
  { key: 'teacher', label: 'Teachers', color: '#27ae60' },
  { key: 'student', label: 'Students', color: '#9b6ddb' },
] as const;

function Donut({ values }: { values: number[] }) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const r = 70, sw = 44, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      <G rotation={-90} origin="100, 100">
        {values.map((v, i) => {
          const len = (v / total) * C;
          const el = (
            <Circle
              key={i} cx={100} cy={100} r={r} fill="none" stroke={SEG[i].color} strokeWidth={sw}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc}
            />
          );
          acc += len;
          return el;
        })}
      </G>
    </Svg>
  );
}

export default function Admin() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [courseCount, setCourseCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [acts, setActs] = useState<Act[]>([]);
  const [rquizzes, setRquizzes] = useState<RQuiz[]>([]);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [error, setError] = useState('');

  async function loadDashboard() {
    const u = await supabase
      .from('profiles')
      .select('id, code, full_name, email, role, status')
      .order('full_name', { ascending: true });
    if (u.error) return setError(u.error.message);
    setUsers(u.data as User[]);
    const c = await supabase.from('courses').select('*', { count: 'exact', head: true });
    setCourseCount(c.count || 0);
    const q = await supabase.from('quizzes').select('*', { count: 'exact', head: true });
    setQuizCount(q.count || 0);
    const a = await supabase.from('activities').select('id, text, created_at').order('created_at', { ascending: false }).limit(5);
    setActs((a.data || []) as Act[]);
    const rq = await supabase.from('quizzes').select('id, title, status, rooms(name)').order('created_at', { ascending: false }).limit(5);
    setRquizzes((rq.data || []) as unknown as RQuiz[]);
  }

  useEffect(() => {
    getProfile()
      .then(async (p) => {
        if (!p || p.role !== 'admin') return router.replace('/');
        setProfile(p);
        await loadDashboard();
      })
      .catch(() => router.replace('/'));
  }, []);

  useEffect(() => {
    if (tab === 'dashboard' && profile) loadDashboard();
  }, [tab]);

  const counts = useMemo(
    () => SEG.map((sg) => (users || []).filter((u) => u.role === sg.key).length),
    [users]
  );

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
      <Header role="admin" name={name} onSignOut={signOut} />

      <View style={{ flex: 1 }}>
        {tab === 'dashboard' ? (
          <ScrollView contentContainerStyle={s.body}>
            <Text style={s.h1}>Dashboard</Text>
            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
            <View style={s.statRow}>
              <Stat label="Total Users" value={users?.length ?? 0} />
              <Stat label="Teachers" value={counts[1]} />
            </View>
            <View style={s.statRow}>
              <Stat label="Students" value={counts[2]} />
              <Stat label="Courses" value={courseCount} />
            </View>
            <View style={s.statRow}>
              <Stat label="Quizzes" value={quizCount} />
              <View style={{ flex: 1 }} />
            </View>

            <Card style={{ alignItems: 'center', gap: 10 }}>
              <Text style={[s.cardTitle, { alignSelf: 'flex-start' }]}>User Distribution</Text>
              <Donut values={counts} />
              <View style={{ gap: 6 }}>
                {SEG.map((sg, i) => (
                  <View key={sg.key} style={s.legend}>
                    <View style={[s.swatch, { backgroundColor: sg.color }]} />
                    <Text style={s.item}>{sg.label} ({counts[i]})</Text>
                  </View>
                ))}
              </View>
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

            <Card style={{ gap: 4 }}>
              <Text style={s.cardTitle}>Recent Quizzes</Text>
              {rquizzes.length === 0 ? <Text style={s.empty}>Nothing yet</Text> : null}
              {rquizzes.map((q, i) => (
                <View key={q.id} style={[s.row, i === rquizzes.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.item, { color: colors.primary }]}>{q.title}</Text>
                    <Text style={s.meta}>{q.rooms?.name}</Text>
                  </View>
                  <Badge text={q.status} kind={q.status === 'published' ? 'ok' : 'warn'} />
                </View>
              ))}
            </Card>
          </ScrollView>
        ) : null}

        {tab === 'users' ? <UsersAdmin selfId={profile.id} /> : null}
        {tab === 'courses' ? <CoursesList /> : null}
        {tab === 'rooms' ? <RoomsAdmin /> : null}
        {tab === 'more' ? <AdminMore /> : null}
      </View>

      <TabBar role="admin" items={TABS} value={tab} onChange={setTab} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 12, paddingBottom: 30 },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 16, minHeight: 96 },
  statL: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  statV: { fontSize: 32, fontFamily: fonts.semibold, color: colors.text, marginTop: 6 },
  cardTitle: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text, marginBottom: 6 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 28, height: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  item: { fontSize: 13.5, fontFamily: fonts.regular, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  empty: { fontFamily: fonts.regular, color: colors.muted, paddingVertical: 10 },
});