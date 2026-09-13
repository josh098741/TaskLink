import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, Redirect, useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { OnboardingProvider } from '../../config/useOnboardingStore';
import { apiFetch } from '../../config/api';

const TOKEN_TIMEOUT_MS = 8000;
const USER_ME_TIMEOUT_MS = 15000;

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export default function SetupLayout() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let isMounted = true;

    async function checkOnboarded() {
      try {
        const cached = await withTimeout(getToken({ skipCache: true }), TOKEN_TIMEOUT_MS, null);
        const token = cached ?? (await withTimeout(getToken(), TOKEN_TIMEOUT_MS, null));

        const me = await withTimeout(
          Promise.resolve(
            token
              ? apiFetch('/user/me', token, {
                  headers: { 'x-clerk-user-id': userId || user?.id || '' },
                  timeoutMs: USER_ME_TIMEOUT_MS,
                })
              : null
          ),
          USER_ME_TIMEOUT_MS,
          null
        );

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
  }, [getToken, isLoaded, isSignedIn, router, userId, user?.id]);

  // Still loading Clerk session
  if (!isLoaded) return null;

  // Not signed in → back to onboarding splash
  if (!isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

  // Checking onboarded status
  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
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

