import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function OnboardingLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { colors } = useTheme();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/gateway" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="step2" />
      <Stack.Screen name="step3" />
      <Stack.Screen name="step4" />
      <Stack.Screen name="step5" />
    </Stack>
  );
}
