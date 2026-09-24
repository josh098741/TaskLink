import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { OnboardingProvider } from '../../config/useOnboardingStore';

/**
 * Setup flow layout.
 *
 * Routing decisions (onboarded → home, new user → setup) are made once in the
 * gateway "Verifying your profile" screen. This layout performs NO network
 * checks and shows NO loading state — it only guards auth state and renders
 * the setup screens immediately.
 */
export default function SetupLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { colors } = useTheme();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="choose-role" />
        <Stack.Screen name="phone" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="complete" />
      </Stack>
    </OnboardingProvider>
  );
}