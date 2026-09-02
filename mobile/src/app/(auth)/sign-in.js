import { View, Text, TextInput, Pressable, SafeAreaView, Image, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useSignIn, useAuth } from '@clerk/expo';
import { useSSO } from '@clerk/expo/experimental';
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
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  useWarmUpBrowser();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isSignedIn) {
    return <Redirect href="/(tabs)/home" />;
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await startSSOFlow({ strategy: 'oauth_google' });
    } catch (err) {
      Alert.alert("Error", err.errors?.[0]?.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!isLoaded || !signIn) return;

    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const completeSignIn = await signIn.create({
        identifier: email.trim(),
        password: password.trim(),
      });

      if (completeSignIn.status === "complete") {
        await setActive({ session: completeSignIn.createdSessionId });
        router.replace('/(tabs)/home');
      }
    } catch (err) {
      Alert.alert("Error", err.errors?.[0]?.message || "Invalid credentials");
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
        <View className="flex-1 px-6 pt-16 pb-10 relative z-10">
          <Pressable
            onPress={() => router.replace('/onboarding/step5')}
            className="mb-8 h-10 w-10 items-center justify-center rounded-full bg-violet-50 border border-violet-100"
          >
            <Ionicons name="chevron-back" size={22} color="#7c3aed" />
          </Pressable>

          <Text className="text-3xl font-bold text-slate-900">Welcome back 👋</Text>
          <Text className="mt-2 text-sm font-medium text-slate-500">
            Login to continue to your account
          </Text>

          <View className="mt-10 flex-1">
            <Text className="mb-2 text-sm font-bold text-slate-800">Email or Phone Number</Text>
            <TextInput
              placeholder="Enter your email or phone"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
            />

            <Text className="mb-2 text-sm font-bold text-slate-800">Password</Text>
            <View className="relative">
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 pr-12 text-base font-medium text-slate-900"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#94a3b8" />
              </Pressable>
            </View>

            <Pressable className="mt-3 self-end" onPress={() => router.push('/forgot-password')}>
              <Text className="text-sm font-bold text-violet-600">Forgot password?</Text>
            </Pressable>

            <Pressable
              onPress={handleSignIn}
              disabled={loading}
              className="mt-8 rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-lg font-bold text-white">
                  Log In
                </Text>
              )}
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
                className="flex-row items-center justify-center rounded-xl border border-slate-200 bg-white py-3.5 shadow-sm shadow-slate-200/50 active:bg-slate-50"
              >
                <View className="mr-3">
                  <FontAwesome name="google" size={20} color="#DB4437" />
                </View>
                <Text className="text-base font-semibold text-slate-700">Continue with Google</Text>
              </Pressable>
              <Pressable className="flex-row items-center justify-center rounded-xl bg-slate-900 py-3.5 shadow-sm shadow-slate-900/20 active:bg-slate-800">
                <View className="mr-3">
                  <FontAwesome name="apple" size={20} color="#ffffff" />
                </View>
                <Text className="text-base font-semibold text-white">Continue with Apple</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-auto flex-row justify-center">
            <Text className="text-sm font-medium text-slate-500">Don&apos;t have an account? </Text>
            <Pressable onPress={() => router.push('/sign-up')}>
              <Text className="text-sm font-bold text-violet-600">Sign up</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
