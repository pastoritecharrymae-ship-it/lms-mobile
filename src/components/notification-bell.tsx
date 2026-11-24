import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { ago } from '../lib/format';
import { colors, fonts } from '../lib/theme';

type Act = { id: string; kind: string; text: string; created_at: string };

export default function NotificationBell() {
  const [items, setItems] = useState<Act[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [uid, setUid] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUid(user.id);
      const pr = await supabase.from('profiles').select('settings').eq('id', user.id).single();
      const st: any = pr.data?.settings || {};
      const { data } = await supabase
        .from('activities')
        .select('id, kind, text, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      const list = ((data || []) as Act[])
        .filter(
          (a) =>
            !(a.kind.startsWith('quiz') && st.notify_quiz === false) &&
            !(['room_created', 'student_joined'].includes(a.kind) && st.notify_room === false)
        )
        .slice(0, 12);
      setItems(list);
      const seen = Number((await AsyncStorage.getItem('seen_' + user.id)) || 0);
      setUnread(!!list[0] && new Date(list[0].created_at).getTime() > seen);
    })();
  }, []);

  async function toggle() {
    setOpen(true);
    setUnread(false);
    if (uid) await AsyncStorage.setItem('seen_' + uid, String(Date.now()));
  }

  return (
    <>
      <Pressable onPress={toggle} hitSlop={8}>
        <Text style={{ fontSize: 22 }}>🔔</Text>
        {unread ? <View style={s.dot} /> : null}
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable style={s.panel} onPress={() => {}}>
            <Text style={s.title}>Notifications</Text>
            <ScrollView>
              {items.length === 0 ? <Text style={s.empty}>No notifications</Text> : null}
              {items.map((a) => (
                <View key={a.id} style={s.row}>
                  <Text style={s.text}>{a.text}</Text>
                  <Text style={s.meta}>{ago(a.created_at)}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  dot: { position: 'absolute', top: 0, right: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger },
  overlay: { flex: 1, backgroundColor: 'rgba(10,20,40,0.35)', alignItems: 'flex-end', paddingTop: 100, paddingHorizontal: 14 },
  panel: {
    width: '92%', maxWidth: 360, maxHeight: 440, backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 8,
  },
  title: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text, padding: 10 },
  row: { padding: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 2 },
  text: { fontSize: 13, fontFamily: fonts.regular, color: colors.text },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  empty: { padding: 14, textAlign: 'center', color: colors.muted, fontFamily: fonts.regular },
});