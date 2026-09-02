import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { OnboardingProvider } from '../../config/useOnboardingStore';

export default function SetupLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  // Still loading Clerk session
  if (!isLoaded) return null;

  // Not signed in → back to onboarding splash
  if (!isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="choose-role" />
        <Stack.Screen name="phone" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="complete" />
      </Stack>
    </OnboardingProvider>
  );
}
