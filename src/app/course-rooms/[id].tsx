import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Header from '../../components/header';
import { Badge } from '../../components/ui';
import { colors, fonts, radius } from '../../lib/theme';

type Room = {
  id: string; name: string; section: string | null; school_year: string | null;
  semester: string | null; code: string; status: string; created_at: string;
  room_students: { count: number }[]; quizzes: { count: number }[];
};

export default function CourseRooms() {
  const router = useRouter();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('rooms')
        .select('id, name, section, school_year, semester, code, status, created_at, room_students(count), quizzes(count)')
        .eq('course_id', id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) setError(error.message);
          else { setError(''); setRooms((data || []) as unknown as Room[]); }
        });
    }, [id])
  );

  return (
    <View style={s.screen}>
      <Header role="teacher" onBack={() => router.back()} />
      <View style={s.body}>
        <Text style={s.h1}>{title || 'Rooms'}</Text>
        <Text style={s.sub}>Rooms in this course</Text>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {!rooms && !error ? <ActivityIndicator /> : null}
        {rooms && rooms.length === 0 ? <Text style={s.empty}>No rooms in this course yet.</Text> : null}
        <FlatList
          data={rooms || []} keyExtractor={(r) => r.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
              onPress={() => router.push({ pathname: '/teacher-room/[id]', params: { id: item.id, name: item.name } } as any)}
            >
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.meta}>{[item.section, item.school_year, item.semester].filter(Boolean).join(' · ')}</Text>
              <Text style={s.meta}>
                {item.room_students[0]?.count || 0} student(s) · {item.quizzes[0]?.count || 0} quiz(zes) · Created {new Date(item.created_at).toLocaleDateString()}
              </Text>
              <View style={s.row}>
                <View style={s.codebox}><Text style={s.code}>{item.code}</Text></View>
                <Badge text={item.status} kind={item.status === 'active' ? 'ok' : 'bad'} />
              </View>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: 18, gap: 10 },
  h1: { fontSize: 24, fontFamily: fonts.semibold, color: colors.text },
  sub: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginTop: -6 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16 },
  name: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  codebox: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  code: { fontSize: 16, fontFamily: fonts.bold, letterSpacing: 3, color: colors.text },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
});