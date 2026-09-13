import { useEffect, useState } from 'react';
import { ActivityIndicator, DevSettings, Text, TouchableOpacity, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';

/**
 * Root index — routes traffic based on auth state.
 * Authenticated users go to /gateway which checks isOnboarded
 * and routes them to either the setup flow or the main tabs.
 */
const CLERK_LOAD_TIMEOUT_MS = 10000;

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    const t = setTimeout(() => setTimedOut(true), CLERK_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
        {timedOut && (
          <TouchableOpacity
            className="mt-6 bg-indigo-600 rounded-full px-6 py-3"
            onPress={() => DevSettings?.reload?.()}
          >
            <Text className="text-white font-bold">Still loading — tap to retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return <Redirect href={isSignedIn ? '/gateway' : '/onboarding'} />;
}