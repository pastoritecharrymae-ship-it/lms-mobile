import { Stack } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import {
  useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
  });
  if (!loaded) return <ActivityIndicator style={{ flex: 1 }} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}