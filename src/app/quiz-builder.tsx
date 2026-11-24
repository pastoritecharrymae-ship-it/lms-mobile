import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import Header from '../components/header';
import { Button, Card, Field } from '../components/ui';
import { colors, fonts } from '../lib/theme';

type QType = 'multiple_choice' | 'identification' | 'true_false' | 'matching';
type Q = {
  type: QType; text: string; points: string; difficulty: string;
  options: string[]; correct: number; answer: string; tf: 'true' | 'false';
  pairs: { left: string; right: string }[];
};

const TYPES: { key: QType; label: string }[] = [
  { key: 'multiple_choice', label: 'Multiple Choice' },
  { key: 'identification', label: 'Identification' },
  { key: 'matching', label: 'Matching' },
  { key: 'true_false', label: 'True or False' },
];
const newQ = (type: QType = 'multiple_choice'): Q => ({
  type, text: '', points: '1', difficulty: 'medium', options: ['', '', '', ''], correct: 0,
  answer: '', tf: 'true', pairs: [{ left: '', right: '' }, { left: '', right: '' }],
});

const p2 = (n: number) => String(n).padStart(2, '0');
const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
const parseDue = (v: string): Date | null => {
  if (!v.trim()) return null;
  const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) throw new Error('Due date must look like 2026-12-31 17:00');
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
};

function Chips<T extends string>({ items, value, onChange }: {
  items: { key: T; label: string }[]; value: T; onChange: (k: T) => void;
}) {
  return (
    <View style={s.chips}>
      {items.map((it) => (
        <Pressable key={it.key} onPress={() => onChange(it.key)} style={[s.chip, value === it.key && s.chipOn]}>
          <Text style={[s.chipT, value === it.key && { color: '#fff' }]}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function QuizBuilder() {
  const router = useRouter();
  const { id, room_id } = useLocalSearchParams<{ id?: string; room_id?: string }>();
  const [loading, setLoading] = useState(!!id);
  const [roomId, setRoomId] = useState(room_id || '');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [due, setDue] = useState('');
  const [qs, setQs] = useState<Q[]>([newQ()]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const z = await supabase.from('quizzes').select('*').eq('id', id).single();
      if (z.error) { Alert.alert('Error', z.error.message); return router.back(); }
      const a = await supabase.from('attempts').select('*', { count: 'exact', head: true }).eq('quiz_id', id);
      if (a.count) {
        Alert.alert('Locked', 'This quiz already has submissions and can no longer be edited.');
        return router.back();
      }
      const r = await supabase.from('questions').select('*').eq('quiz_id', id).order('position');
      setRoomId(z.data.room_id);
      setTitle(z.data.title);
      setDesc(z.data.description || '');
      const m = z.data.time_limit_minutes || 0;
      setHours(m ? String(Math.floor(m / 60)) : '');
      setMins(m ? String(m % 60) : '');
      setDue(toLocal(z.data.due_date));
      const list = (r.data || []).map((row: any) => {
        const x = newQ(row.type);
        x.text = row.text; x.points = String(row.points); x.difficulty = row.difficulty || 'medium';
        if (row.type === 'multiple_choice') {
          x.options = [...(row.options || []), '', '', '', ''].slice(0, 4);
          x.correct = Math.max(0, x.options.indexOf(row.answer));
        }
        if (row.type === 'identification') x.answer = row.answer || '';
        if (row.type === 'true_false') x.tf = row.answer === 'false' ? 'false' : 'true';
        if (row.type === 'matching' && row.options?.length) x.pairs = row.options;
        return x;
      });
      if (list.length) setQs(list);
      setLoading(false);
    })();
  }, [id]);

  const upd = (i: number, patch: Partial<Q>) => setQs((l) => l.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const total = qs.reduce((t, q) => t + (Number(q.points) || 0), 0);

  function validate(publish: boolean): string | null {
    if (!title.trim()) return 'Please enter a quiz title';
    if (!publish) return null;
    if (!qs.length) return 'Add at least one question';
    for (const [i, x] of qs.entries()) {
      const n = `Question ${i + 1}: `;
      if (!x.text.trim()) return n + 'enter the question text';
      if (!(Number(x.points) > 0)) return n + 'points must be greater than 0';
      if (x.type === 'multiple_choice') {
        if (x.options.filter((o) => o.trim()).length < 4) return n + 'fill in all four choices (A, B, C and D)';
        if (!x.options[x.correct]?.trim()) return n + 'select a non-empty correct choice';
      }
      if (x.type === 'identification' && !x.answer.trim()) return n + 'enter the correct answer';
      if (x.type === 'matching' && x.pairs.filter((p) => p.left.trim() && p.right.trim()).length < 2)
        return n + 'provide at least two complete pairs';
    }
    return null;
  }

  async function save(status: 'draft' | 'published') {
    try {
      const err = validate(status === 'published');
      if (err) throw new Error(err);
      const dueDate = parseDue(due);
      if (status === 'published' && dueDate && dueDate < new Date()) throw new Error('The due date is in the past');
      setBusy(true);
      const limit = (Number(hours) || 0) * 60 + (Number(mins) || 0);
      const row = {
        room_id: roomId, title: title.trim(), description: desc || null,
        time_limit_minutes: limit || null, due_date: dueDate ? dueDate.toISOString() : null,
        total_points: total, question_count: qs.length, status,
      };
      let qid = id as string | undefined;
      if (qid) {
        const u = await supabase.from('quizzes').update(row).eq('id', qid);
        if (u.error) throw u.error;
        const d = await supabase.from('questions').delete().eq('quiz_id', qid);
        if (d.error) throw d.error;
      } else {
        const ins = await supabase.from('quizzes').insert(row).select('id').single();
        if (ins.error) throw ins.error;
        qid = ins.data.id;
      }
      const rows = qs.map((x, i) => {
        const r: any = {
          quiz_id: qid, position: i, type: x.type, text: x.text.trim(),
          points: Number(x.points) || 1, difficulty: x.difficulty || 'medium', options: null, answer: null,
        };
        if (x.type === 'multiple_choice') {
          r.answer = x.options[x.correct]?.trim() || null;
          r.options = x.options.map((o) => o.trim()).filter(Boolean);
        }
        if (x.type === 'identification') r.answer = x.answer.trim();
        if (x.type === 'true_false') r.answer = x.tf;
        if (x.type === 'matching')
          r.options = x.pairs.map((p) => ({ left: p.left.trim(), right: p.right.trim() })).filter((p) => p.left && p.right);
        return r;
      });
      if (rows.length) {
        const qi = await supabase.from('questions').insert(rows);
        if (qi.error) throw qi.error;
      }
      Alert.alert(status === 'published' ? 'Quiz published' : 'Draft saved');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
    setBusy(false);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={s.screen}>
      <Header role="teacher" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>{id ? 'Edit Quiz' : 'Create New Quiz'}</Text>

        <Card style={{ gap: 12 }}>
          <Field label="Quiz Title" placeholder="e.g. Quiz 1 - HTML Basics" value={title} onChangeText={setTitle} />
          <Field label="Description" multiline value={desc} onChangeText={setDesc} />
          <Text style={s.label}>Time Limit (optional)</Text>
          <View style={s.pair}>
            <View style={{ flex: 1 }}><Field placeholder="0" keyboardType="number-pad" value={hours} onChangeText={setHours} /></View>
            <Text style={s.unit}>hr</Text>
            <View style={{ flex: 1 }}><Field placeholder="0" keyboardType="number-pad" value={mins} onChangeText={setMins} /></View>
            <Text style={s.unit}>min</Text>
          </View>
          <Field label="Due Date (optional)" placeholder="2026-12-31 17:00" autoCapitalize="none" value={due} onChangeText={setDue} />
          <Text style={s.hint}>Format: YYYY-MM-DD HH:MM (24-hour). Total points: {total}</Text>
        </Card>

        {qs.map((x, i) => (
          <Card key={i} style={{ gap: 10 }}>
            <View style={s.qhead}>
              <Text style={s.qn}>Q{i + 1}</Text>
              <Pressable onPress={() => setQs((l) => l.filter((_, k) => k !== i))}>
                <Text style={s.del}>🗑 Delete</Text>
              </Pressable>
            </View>
            <Field placeholder="Question text" multiline value={x.text} onChangeText={(t) => upd(i, { text: t })} />
            <Chips items={TYPES} value={x.type} onChange={(t) => upd(i, { type: t })} />
            <View style={{ width: 120 }}>
              <Field label="Points" keyboardType="decimal-pad" value={x.points} onChangeText={(t) => upd(i, { points: t })} />
            </View>

            {x.type === 'multiple_choice' ? (
              <>
                {x.options.map((o, oi) => (
                  <View key={oi} style={s.pair}>
                    <Pressable onPress={() => upd(i, { correct: oi })} style={[s.radio, x.correct === oi && s.radioOn]}>
                      {x.correct === oi ? <View style={s.dot} /> : null}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Field
                        placeholder={`Choice ${String.fromCharCode(65 + oi)}`} value={o}
                        onChangeText={(t) => upd(i, { options: x.options.map((v, k) => (k === oi ? t : v)) })}
                      />
                    </View>
                  </View>
                ))}
                <Text style={s.hint}>Tap the circle next to the correct choice.</Text>
              </>
            ) : null}

            {x.type === 'identification' ? (
              <>
                <Field label="Correct answer" value={x.answer} onChangeText={(t) => upd(i, { answer: t })} />
                <Text style={s.hint}>Separate several accepted answers with “|”. Upper/lower case is ignored.</Text>
              </>
            ) : null}

            {x.type === 'true_false' ? (
              <Chips<'true' | 'false'>
                items={[{ key: 'true', label: 'True' }, { key: 'false', label: 'False' }]}
                value={x.tf} onChange={(v) => upd(i, { tf: v })}
              />
            ) : null}

            {x.type === 'matching' ? (
              <>
                {x.pairs.map((p, pi) => (
                  <View key={pi} style={s.pair}>
                    <View style={{ flex: 1 }}>
                      <Field placeholder="e.g. CPU" value={p.left}
                        onChangeText={(t) => upd(i, { pairs: x.pairs.map((v, k) => (k === pi ? { ...v, left: t } : v)) })} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field placeholder="e.g. Process data" value={p.right}
                        onChangeText={(t) => upd(i, { pairs: x.pairs.map((v, k) => (k === pi ? { ...v, right: t } : v)) })} />
                    </View>
                    {x.pairs.length > 2 ? (
                      <Pressable onPress={() => upd(i, { pairs: x.pairs.filter((_, k) => k !== pi) })}>
                        <Text style={s.del}>✕</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable onPress={() => upd(i, { pairs: [...x.pairs, { left: '', right: '' }] })}>
                  <Text style={s.link}>[ Add Pair + ]</Text>
                </Pressable>
              </>
            ) : null}
          </Card>
        ))}

        <Button title="+ Add Question" variant="default" onPress={() => setQs((l) => [...l, newQ()])} />
        <View style={s.pair}>
          <Button title="Save as Draft" variant="default" style={{ flex: 1 }} onPress={() => save('draft')} disabled={busy} />
          <Button title={busy ? '...' : 'Publish Quiz'} style={{ flex: 1 }} onPress={() => save('published')} disabled={busy} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 12, paddingBottom: 60 },
  h1: { fontSize: 24, fontFamily: fonts.semibold, color: colors.text },
  label: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.text },
  hint: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  pair: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  unit: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  qhead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qn: { fontSize: 16, fontFamily: fonts.bold, color: colors.text },
  del: { fontSize: 13, fontFamily: fonts.medium, color: colors.danger },
  link: { fontSize: 13, fontFamily: fonts.medium, color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipT: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});