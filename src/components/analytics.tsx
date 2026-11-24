import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Card } from './ui';
import { colors, fonts } from '../lib/theme';

const PASS = 60;
const GOOD = 75;

type Row = {
  quiz_id: string; student_id: string; percentage: number;
  quizzes: { title: string } | null; profiles: { full_name: string } | null;
};

function Bar({ label, pct }: { label: string; pct: number }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <View style={s.bar}>
      <Text style={s.lbl} numberOfLines={1}>{label}</Text>
      <View style={s.trk}>
        <View style={[s.fill, { width: `${w}%` as any, backgroundColor: pct >= GOOD ? '#43b94f' : '#d05a5a' }]}>
          <Text style={s.fillTxt}>{Math.round(pct)}%</Text>
        </View>
      </View>
    </View>
  );
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const group = (rows: Row[], key: (r: Row) => string) => {
  const m = new Map<string, number[]>();
  rows.forEach((r) => m.set(key(r), [...(m.get(key(r)) || []), Number(r.percentage)]));
  return [...m.entries()].map(([label, v]) => ({ label, pct: avg(v) }));
};

// Row Level Security already limits what each role can read:
// a student sees their own attempts, a teacher sees their rooms', an admin sees all.
export default function Analytics({ role }: { role: 'admin' | 'teacher' | 'student' }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('attempts')
      .select('quiz_id, student_id, percentage, quizzes(title), profiles(full_name)')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data || []) as unknown as Row[]);
      });
  }, []);

  if (error) return <Text style={{ color: colors.danger, padding: 18 }}>{error}</Text>;
  if (!rows) return <ActivityIndicator style={{ flex: 1 }} />;

  const all = rows.map((r) => Number(r.percentage));
  const passed = all.filter((p) => p >= PASS).length;
  const byQuiz = group(rows, (r) => r.quizzes?.title || 'Quiz');
  const byStudent = group(rows, (r) => r.profiles?.full_name || 'Student');

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <Card style={s.stat}>
      <Text style={s.statL}>{label}</Text>
      <Text style={s.statV}>{value}</Text>
    </Card>
  );

  return (
    <ScrollView contentContainerStyle={s.body}>
      <Text style={s.h1}>Analytics</Text>

      <View style={s.statRow}>
        <Stat label={role === 'student' ? 'Quizzes taken' : 'Submissions'} value={String(rows.length)} />
        <Stat label="Average" value={`${avg(all).toFixed(1)}%`} />
      </View>
      <View style={s.statRow}>
        <Stat label={`Passed (${PASS}%+)`} value={String(passed)} />
        <Stat label="Pass rate" value={rows.length ? `${Math.round((passed / rows.length) * 100)}%` : '0%'} />
      </View>

      {rows.length === 0 ? <Card><Text style={s.empty}>No quiz results yet.</Text></Card> : null}

      {rows.length > 0 ? (
        <Card style={{ gap: 2 }}>
          <Text style={s.cardTitle}>{role === 'student' ? 'My scores' : 'Average per quiz'}</Text>
          {byQuiz.map((b) => <Bar key={b.label} label={b.label} pct={b.pct} />)}
        </Card>
      ) : null}

      {role !== 'student' && rows.length > 0 ? (
        <Card style={{ gap: 2 }}>
          <Text style={s.cardTitle}>Average per student</Text>
          {byStudent.map((b) => <Bar key={b.label} label={b.label} pct={b.pct} />)}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  body: { padding: 18, gap: 14, paddingBottom: 40 },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 16, minHeight: 90 },
  statL: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  statV: { fontSize: 28, fontFamily: fonts.semibold, color: colors.text, marginTop: 6 },
  cardTitle: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text, marginBottom: 6 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  lbl: { width: 110, fontSize: 12.5, fontFamily: fonts.regular, color: colors.text },
  trk: {
    flex: 1, height: 20, borderRadius: 3, overflow: 'hidden',
    backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border,
  },
  fill: { height: '100%', justifyContent: 'center', minWidth: 34 },
  fillTxt: { color: '#fff', fontSize: 11, fontFamily: fonts.medium, textAlign: 'center' },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center' },
});