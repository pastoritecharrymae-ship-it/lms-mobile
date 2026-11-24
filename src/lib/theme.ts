const light = {
  bg: '#f6f8fb',
  card: '#ffffff',
  text: '#0b1220',
  muted: '#6b7280',
  border: '#dbe3ee',
  primary: '#2f7bd1',
  primaryDark: '#2467b3',
  danger: '#d64545',
  ok: '#2e9e5b',
  warn: '#e0a020',
  soft: '#eef4fc',
  loginTitle: '#143a6b',
  brandDark: '#0d2239',
};

const dark = {
  ...light,
  bg: '#0e1522',
  card: '#162033',
  text: '#e8eef9',
  muted: '#93a1b8',
  border: '#27344d',
  soft: '#1c2a42',
  loginTitle: '#8fb4ee',
};

// mutable on purpose: applyTheme() changes it before any screen loads
export const colors = { ...light };
export let mode: 'light' | 'dark' = 'light';

export function applyTheme(m: 'light' | 'dark') {
  mode = m;
  Object.assign(colors, m === 'dark' ? dark : light);
}

export const roleColors = {
  admin: { side: '#0f2a4d', avatar: '#2f7bd1' },
  teacher: { side: '#134e35', avatar: '#27ae60' },
  student: { side: '#240f4d', avatar: '#9b6ddb' },
};

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

export const radius = { sm: 6, md: 8, lg: 12, pill: 999 };