import { useEffect, useState } from 'react';
import { Stack, Redirect, useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { OnboardingProvider } from '../../config/useOnboardingStore';
import { apiFetch } from '../../config/api';

export default function SetupLayout() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setChecking(false);
      return;
    }

    let isMounted = true;

    async function checkOnboarded() {
      try {
        let token = await getToken({ skipCache: true }).catch(() => null);
        if (!token) {
          token = await getToken().catch(() => null);
        }

        const me = await apiFetch('/user/me', token, {
          headers: { 'x-clerk-user-id': userId || user?.id || '' },
        });

        if (isMounted && me && me.isOnboarded) {
          router.replace('/(tabs)/home');
          return;
        }
      } catch (err) {
        console.warn('Setup layout onboarded check:', err.message);
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    }

    checkOnboarded();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, userId]);

  // Still loading Clerk session or checking onboarded status
  if (!isLoaded || checking) return null;

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

