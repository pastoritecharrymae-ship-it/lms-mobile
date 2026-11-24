import { supabase } from './supabase';

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'inactive';
};

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, status')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return data as Profile;
}