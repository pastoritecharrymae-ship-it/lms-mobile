import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { Card } from './ui';
import { colors, fonts } from '../lib/theme';

const GOOD = 75;

type Row = {
  percentage: number;
  quizzes: { id: string; title: string; created_at: string; rooms: { name: string } | null } | null;
};

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

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

function Trend({ points }: { points: { label: string; v: number }[] }) {
  const W = 320, H = 220, L = 38, R = 10, T = 10, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const x = (i: number) => (points.length === 1 ? L + iw / 2 : L + (i / (points.length - 1)) * iw);
  const y = (v: number) => T + ih - (v / 100) * ih;
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {[0, 20, 40, 60, 80, 100].map((g) => (
        <View key={g}>
          <Line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#e5e7eb" strokeWidth={1} />
          <SvgText x={L - 6} y={y(g) + 4} fontSize={10} fill="#4b5563" textAnchor="end">{g}%</SvgText>
        </View>
      ))}
      {points.length > 1 ? (
        <Polyline points={points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} fill="none" stroke="#43b94f" strokeWidth={2} />
      ) : null}
      {points.map((p, i) => (
        <View key={i}>
          <Circle cx={x(i)} cy={y(p.v)} r={4} fill="#d9f7e3" stroke="#43b94f" strokeWidth={2} />
          <SvgText x={x(i)} y={H - 8} fontSize={10} fill="#4b5563" textAnchor="middle">{p.label.slice(0, 10)}</SvgText>
        </View>
      ))}
    </Svg>
  );
}

export default function AdminAnalytics() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [students, setStudents] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const a = await supabase
        .from('attempts')
        .select('percentage, quizzes(id, title, created_at, rooms(name))');
      if (a.error) return setError(a.error.message);
      setRows((a.data || []) as unknown as Row[]);
      const st = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
      setStudents(st.count || 0);
      const rm = await supabase.from('rooms').select('*', { count: 'exact', head: true });
      setRoomCount(rm.count || 0);
      const qz = await supabase.from('quizzes').select('*', { count: 'exact', head: true });
      setQuizCount(qz.count || 0);
    })();
  }, []);

  if (error) return <Text style={{ color: colors.danger, padding: 18 }}>{error}</Text>;
  if (!rows) return <ActivityIndicator style={{ flex: 1 }} />;

  const all = rows.map((r) => Number(r.percentage));

  const group = (key: (r: Row) => string) => {
    const m = new Map<string, number[]>();
    rows.forEach((r) => {
      const k = key(r);
      m.set(k, [...(m.get(k) || []), Number(r.percentage)]);
    });
    return [...m.entries()].map(([label, v]) => ({ label, v: avg(v) }));
  };
  const byQuiz = group((r) => r.quizzes?.title || 'Quiz');
  const byRoom = group((r) => r.quizzes?.rooms?.name || 'Room');

  // trend: average per quiz, oldest quiz first
  const trendMap = new Map<string, { label: string; at: string; v: number[] }>();
  rows.forEach((r) => {
    const q = r.quizzes;
    if (!q) return;
    const cur = trendMap.get(q.id) || { label: q.title, at: q.created_at, v: [] };
    cur.v.push(Number(r.percentage));
    trendMap.set(q.id, cur);
  });
  const trend = [...trendMap.values()]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((t) => ({ label: t.label, v: avg(t.v) }));

  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <Card style={s.stat}>
      <Text style={s.statL}>{label}</Text>
      <Text style={s.statV}>{value}</Text>
    </Card>
  );

  return (
    <ScrollView contentContainerStyle={s.body}>
      <Text style={s.h1}>📈 Analytics</Text>

      <View style={s.statRow}>
        <Stat label="Total Students" value={students} />
        <Stat label="Total Rooms" value={roomCount} />
      </View>
      <View style={s.statRow}>
        <Stat label="Total Quizzes" value={quizCount} />
        <Stat label="Average Score" value={`${Math.round(avg(all) * 10) / 10}%`} />
      </View>

      <Card style={{ gap: 8 }}>
        <Text style={s.cardTitle}>Performance Trend</Text>
        {trend.length ? <Trend points={trend} /> : <Text style={s.empty}>No quiz results yet</Text>}
      </Card>

      <Card style={{ gap: 2 }}>
        <Text style={s.cardTitle}>Room Performance</Text>
        {byRoom.length === 0 ? <Text style={s.empty}>No data</Text> : null}
        {byRoom.map((b) => <Bar key={b.label} label={b.label} pct={b.v} />)}
      </Card>

      <Card style={{ gap: 2 }}>
        <Text style={s.cardTitle}>Quiz Performance</Text>
        {byQuiz.length === 0 ? <Text style={s.empty}>No data</Text> : null}
        {byQuiz.map((b) => <Bar key={b.label} label={b.label} pct={b.v} />)}
      </Card>
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
  lbl: { width: 100, fontSize: 13, fontFamily: fonts.regular, color: colors.text },
  trk: { flex: 1, height: 20, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.soft },
  fill: { height: '100%', justifyContent: 'center', minWidth: 34 },
  fillTxt: { color: '#fff', fontSize: 11, fontFamily: fonts.medium, textAlign: 'center' },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 12 },
});