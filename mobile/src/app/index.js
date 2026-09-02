import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';

/**
 * Root index — routes traffic based on auth state.
 * Authenticated users go to /gateway which checks isOnboarded
 * and routes them to either the setup flow or the main tabs.
 */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  return <Redirect href={isSignedIn ? '/gateway' : '/onboarding'} />;
}
