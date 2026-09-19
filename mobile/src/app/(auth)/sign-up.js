import { View, Text, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, ActivityIndicator, Alert } from "react-native";
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
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
};

export default function SignUp() {
  const router = useRouter();
  const { signup, isSignedIn } = useAuth();
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();

  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isSignedIn) {
    return <Redirect href="/gateway" />;
  }

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      // Opens Google in the system browser; the result deep-links back to
      // /sso-callback, which posts the idToken to the backend and signs in.
      await beginGoogleOAuth();
    } catch (err) {
      const cancelled = /cancel/i.test(err?.message || "");
      const message = err?.message || "Google sign-up failed. Please try again.";
      const detail = err?.detail ? `\n\n${err.detail}` : "";
      console.error('[google-signup] error:', err);
      Alert.alert('Error', cancelled ? 'Google sign-up was cancelled.' : message + detail);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      await signup({ email: email.trim(), password, firstName, lastName });
      router.replace("/gateway");
    } catch (err) {
      const message = err?.message || "Something went wrong";
      // Surface the real server reason, but strip the noisy "Error: " prefix
      // that apiFetch tacks on.
      const clean = message.replace(/^Error:\s*/, "");

      if (/already exists|already registered/i.test(clean)) {
        Alert.alert(
          "Account already exists",
          "That email is already registered. Would you like to sign in instead?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign in",
              onPress: () => router.replace("/sign-in"),
            },
          ]
        );
        return;
      }

      Alert.alert("Couldn't create account", clean);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Image source={require('../../../assets/images/tasklink.png')} className="absolute top-0 right-0 w-64 h-64 opacity-10" resizeMode="contain" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: Math.max(insets.bottom, 40) }} showsVerticalScrollIndicator={false}>
          <View className="relative z-10">
            <Pressable onPress={() => router.back()} className="mb-6 h-10 w-10 items-center justify-center rounded-full bg-violet-50 border border-violet-100">
              <Ionicons name="chevron-back" size={22} color="#7c3aed" />
            </Pressable>
            <Text className="text-3xl font-bold text-slate-900">Create account</Text>
            <Text className="mt-2 text-sm font-medium text-slate-500">Join TaskLink and start getting things done</Text>
            <View className="mt-8">
              <Text className="mb-2 text-sm font-bold text-slate-800">Full Name</Text>
              <TextInput placeholder="Enter your full name" placeholderTextColor="#94a3b8" value={fullName} onChangeText={setFullName} className="mb-5 rounded-full border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900" />
              <Text className="mb-2 text-sm font-bold text-slate-800">Email</Text>
              <TextInput placeholder="Enter your email" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} className="mb-5 rounded-full border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900" />
              <Text className="mb-2 text-sm font-bold text-slate-800">Password</Text>
              <View className="relative mb-2">
                <TextInput placeholder="Create a password" placeholderTextColor="#94a3b8" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} className="rounded-full border border-slate-200 bg-white px-5 py-4 pr-12 text-base font-medium text-slate-900" />
                <Pressable onPress={() => setShowPassword(!showPassword)} className="absolute right-4 top-4">
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#94a3b8" />
                </Pressable>
              </View>
              <Text className="mb-6 text-xs text-slate-400">Must be at least 8 characters</Text>
              <Pressable onPress={handleSignUp} disabled={loading} className="rounded-full bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700">
                {loading ? (<ActivityIndicator color="#ffffff" />) : (<Text className="text-center text-lg font-bold text-white">Create Account</Text>)}
              </Pressable>
              <View className="mt-8 flex-row items-center justify-center">
                <View className="h-[1px] flex-1 bg-slate-200" />
                <Text className="mx-4 text-sm font-medium text-slate-400">or continue with</Text>
                <View className="h-[1px] flex-1 bg-slate-200" />
              </View>
              <View className="mt-5 gap-3">
                <Pressable onPress={handleGoogleSignUp} disabled={loading} className="flex-row items-center justify-center rounded-full border border-slate-200 bg-white py-3.5 shadow-sm shadow-slate-200/50 active:bg-slate-50">
                  <View className="mr-3"><FontAwesome name="google" size={20} color="#DB4437" /></View>
                  <Text className="text-base font-semibold text-slate-700">Continue with Google</Text>
                </Pressable>
              </View>
            </View>
            <View className="mt-10 flex-row justify-center">
              <Text className="text-sm font-medium text-slate-500">Already have an account? </Text>
              <Pressable onPress={() => router.replace('/sign-in')}><Text className="text-sm font-bold text-violet-600">Sign in</Text></Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}