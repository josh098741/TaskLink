import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

/**
 * Root index — routes traffic based on auth state.
 * Authenticated users go to /gateway which checks isOnboarded
 * and routes them to either the setup flow or the main tabs.
 *
 * While auth is loading, the native splash screen remains visible (see
 *preventAutoHideAsync in _layout.js), so no blank frame appears.
 */
export default function Index() {
    const { isLoaded, isSignedIn } = useAuth();

    useEffect(() => {
        if (isLoaded) {
            SplashScreen.hideAsync();
        }
    }, [isLoaded]);

    if (!isLoaded) {
        return null;
    }

    return <Redirect href={isSignedIn ? '/gateway' : '/onboarding'} />;
}