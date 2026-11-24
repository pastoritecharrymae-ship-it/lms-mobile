import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getProfile, Profile } from '../lib/profile';
import Header from '../components/header';
import TabBar, { TabItem } from '../components/tab-bar';
import StudentRooms from '../components/student-rooms';
import MyQuizzes from '../components/my-quizzes';
import Analytics from '../components/analytics';
import SettingsPanel from '../components/settings-panel';
import { Badge, Button, Card } from '../components/ui';
import { colors, fonts, radius } from '../lib/theme';

type Tab = 'dashboard' | 'courses' | 'quizzes' | 'analytics' | 'settings';
const TABS: TabItem<Tab>[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'courses', label: 'Courses', icon: '📋' },
  { key: 'quizzes', label: 'My Quiz', icon: '📝' },
  { key: 'analytics', label: 'Analytics', icon: '📈' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

type Room = {
  id: string; name: string; status: string;
  courses: { name: string } | null; teacher: { full_name: string } | null;
};

export default function Student() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [done, setDone] = useState(0);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');

  async function load(p: Profile) {
    const r = await supabase
      .from('room_students')
      .select('rooms(id, name, status, courses(name), teacher:profiles!teacher_id(full_name))')
      .eq('student_id', p.id)
      .order('joined_at', { ascending: false });
    if (r.error) return setError(r.error.message);
    setError('');
    setRooms(((r.data || []) as any[]).map((x) => x.rooms).filter(Boolean));
    const a = await supabase.from('attempts').select('*', { count: 'exact', head: true }).eq('student_id', p.id);
    setDone(a.count || 0);
  }

  useEffect(() => {
    getProfile()
      .then((p) => {
        if (!p || p.role !== 'student') return router.replace('/');
        setProfile(p);
        load(p);
        AsyncStorage.getItem('resume').then((v) => {
          if (v === 'settings') {
            setTab('settings');
            AsyncStorage.removeItem('resume');
          }
        });
      })
      .catch(() => router.replace('/'));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (profile) load(profile);
    }, [profile])
  );

  async function joinRoom() {
    if (!code.trim() || !profile) return;
    setJoining(true);
    const { error } = await supabase.rpc('join_room', { p_code: code.trim() });
    setJoining(false);
    if (error) return Alert.alert('Could not join', error.message);
    setCode('');
    setRefreshKey((k) => k + 1);
    load(profile);
    Alert.alert('Joined', 'You joined the room.');
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (!profile) return <ActivityIndicator style={{ flex: 1 }} />;
  const name = profile.full_name || profile.email;

  return (
    <View style={s.screen}>
      <Header role="student" name={name} onSignOut={signOut} />

      <View style={{ flex: 1 }}>
        {tab === 'dashboard' ? (
          <ScrollView contentContainerStyle={s.body}>
            <Text style={s.h1}>Dashboard</Text>
            <View style={s.stats}>
              <Card style={s.stat}>
                <Text style={s.statL}>My Courses</Text>
                <Text style={s.statV}>{rooms?.length ?? '–'}</Text>
              </Card>
              <Card style={s.stat}>
                <Text style={s.statL}>Quiz Completed</Text>
                <Text style={s.statV}>{done}</Text>
              </Card>
            </View>

            <Card style={{ gap: 12 }}>
              <Text style={s.cardTitle}>Join a room</Text>
              <TextInput
                style={s.input}
                placeholder="ENTER ROOM CODE (E.G. GGWP30)"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                value={code}
                onChangeText={setCode}
              />
              <Button title={joining ? '...' : 'Join'} onPress={joinRoom} disabled={joining} />
            </Card>

            <Card style={{ gap: 12 }}>
              <Text style={s.cardTitle}>My Courses</Text>
              {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
              {!rooms && !error ? <ActivityIndicator /> : null}
              {rooms && rooms.length === 0 ? <Text style={s.empty}>You haven't joined any rooms yet.</Text> : null}
              {rooms?.map((r) => (
                <View key={r.id} style={s.course}>
                  <Text style={s.courseName}>{(r.courses?.name || 'No course').toUpperCase()}</Text>
                  <Text style={s.courseRoom}>{r.name}</Text>
                  <Text style={s.teacher}>Teacher: {r.teacher?.full_name || '—'}</Text>
                  <View style={s.courseFoot}>
                    <Badge text={r.status} kind={r.status === 'active' ? 'ok' : 'bad'} />
                    <Pressable
                      style={s.viewBtn}
                      onPress={() => router.push({ pathname: '/room/[id]', params: { id: r.id, name: r.name } } as any)}
                    >
                      <Text style={s.viewTxt}>View room</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Card>
          </ScrollView>
        ) : null}

        {tab === 'courses' ? (
          <View style={[s.body, { flex: 1 }]}>
            <Text style={s.h1}>My Courses</Text>
            <View style={{ flex: 1 }}>
              <StudentRooms studentId={profile.id} refreshKey={refreshKey} />
            </View>
          </View>
        ) : null}

        {tab === 'quizzes' ? <MyQuizzes /> : null}
        {tab === 'analytics' ? <Analytics role="student" /> : null}
        {tab === 'settings' ? <SettingsPanel /> : null}
      </View>

      <TabBar role="student" items={TABS} value={tab} onChange={setTab} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 14, paddingBottom: 40 },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 16, minHeight: 96 },
  statL: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  statV: { fontSize: 32, fontFamily: fonts.semibold, color: colors.text, marginTop: 6 },
  cardTitle: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text },
  input: {
    fontFamily: fonts.regular, fontSize: 14, padding: 12, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: colors.card, color: colors.text,
  },
  empty: { fontFamily: fonts.regular, color: colors.muted },
  course: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, gap: 4 },
  courseName: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  courseRoom: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  teacher: { fontSize: 16, fontFamily: fonts.regular, color: colors.text, marginTop: 4 },
  courseFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  viewBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
  viewTxt: { fontSize: 13.5, fontFamily: fonts.medium, color: colors.text },
});