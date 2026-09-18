import { View, Text, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect } from "expo-router";
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { beginGoogleOAuth } from '../../config/googleAuth';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const useWarmUpBrowser = () => {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

export default function SignIn() {
  const router = useRouter();
  const { login, isSignedIn } = useAuth();
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isSignedIn) {
    return <Redirect href="/gateway" />;
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      // Opens Google in the system browser; the result deep-links back to
      // /sso-callback, which posts the idToken to the backend and signs in.
      await beginGoogleOAuth();
    } catch (err) {
      const cancelled = /cancel/i.test(err?.message || "");
      const message = err?.message || "Google sign-in failed. Please try again.";
      console.error('[google-signin] error:', err);
      Alert.alert('Error', cancelled ? 'Google sign-in was cancelled.' : message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      router.replace("/gateway");
    } catch (err) {
      const clean = (err?.message || "Invalid credentials").replace(/^Error:\s*/, "");
      Alert.alert("Sign in failed", clean);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Image
        source={require('../../../assets/images/tasklink.png')}
        className="absolute top-0 right-0 w-64 h-64 opacity-10"
        resizeMode="contain"
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-6 pt-16 pb-10 relative z-10" style={{ paddingBottom: Math.max(insets.bottom, 40) }}>
          <Text className="text-2xl font-extrabold text-center text-slate-900">Task<Text className="text-violet-600">Link</Text></Text>
          <Text className="mt-4 text-3xl font-bold text-center text-slate-900">
            Sign In To Your Account
          </Text>
          <Text className="mt-2 text-sm font-medium text-center text-slate-500">
            Unleash Your Inner Potential right now
          </Text>

          <View className="mt-10 flex-1">
            <Text className="mb-2 text-sm font-bold text-slate-800">Email or Phone Number</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              className="mb-6 rounded-full border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
            />

            <Text className="mb-2 text-sm font-bold text-slate-800">Password</Text>
            <View className="relative">
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                className="rounded-full border border-slate-200 bg-white px-5 py-4 pr-12 text-base font-medium text-slate-900"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#94a3b8" />
              </Pressable>
            </View>

            <Pressable
              onPress={handleSignIn}
              disabled={loading}
              className="mt-8 rounded-full bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View className="flex-row items-center justify-center">
                  <Ionicons name="log-in-outline" size={22} color="#ffffff" />
                  <Text className="ml-2 text-center text-lg font-bold text-white">
                    Sign In
                  </Text>
                </View>
              )}
            </Pressable>

            <View className="mt-4 flex-row justify-center">
              <Text className="text-sm font-medium text-slate-500">Don&apos;t have an account? </Text>
              <Pressable onPress={() => router.push('/sign-up')}>
                <Text className="text-sm font-bold text-violet-600">Sign up</Text>
              </Pressable>
            </View>

            <Pressable className="mt-2" onPress={() => router.push('/forgot-password')}>
              <Text className="text-center text-sm font-bold text-violet-600">Forgot password?</Text>
            </Pressable>

            <View className="mt-10 flex-row items-center justify-center">
              <View className="h-[1px] flex-1 bg-slate-200" />
              <Text className="mx-4 text-sm font-medium text-slate-400">or continue with</Text>
              <View className="h-[1px] flex-1 bg-slate-200" />
            </View>

            <View className="mt-6 gap-3">
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={loading}
                className="flex-row items-center justify-center rounded-full border border-slate-200 bg-white py-3.5 shadow-sm shadow-slate-200/50 active:bg-slate-50"
              >
                <View className="mr-3">
                  <FontAwesome name="google" size={20} color="#DB4437" />
                </View>
                <Text className="text-base font-semibold text-slate-700">Continue with Google</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}