import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  return <Redirect href={isSignedIn ? '/(tabs)/home' : '/onboarding'} />;
}
