import { View, Text, TextInput, Pressable, SafeAreaView, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, ActivityIndicator, Alert } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useSignUp, useAuth } from '@clerk/expo';
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

export default function SignUp() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  useWarmUpBrowser();

  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (isSignedIn) {
    return <Redirect href="/(tabs)/home" />;
  }

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await startSSOFlow({ strategy: 'oauth_google' });
    } catch (err) {
      Alert.alert("Error", err.errors?.[0]?.message || "Google sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password: password.trim(),
        firstName: fullName.trim().split(' ')[0] || '',
        lastName: fullName.trim().split(' ').slice(1).join(' ') || '',
        phoneNumber: phone.trim() || undefined,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      Alert.alert("Error", err.errors?.[0]?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded || !signUp) return;

    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/(tabs)/home');
      }
    } catch (err) {
      Alert.alert("Error", err.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-1 px-6 pt-16 pb-10">
            <Pressable
              onPress={() => setPendingVerification(false)}
              className="mb-8 h-10 w-10 items-center justify-center rounded-full bg-violet-50 border border-violet-100"
            >
              <Ionicons name="chevron-back" size={22} color="#7c3aed" />
            </Pressable>

            <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-violet-50">
              <Ionicons name="mail-outline" size={36} color="#7c3aed" />
            </View>

            <Text className="text-3xl font-bold text-slate-900">Verify your email</Text>
            <Text className="mt-2 text-sm font-medium text-slate-500 leading-5">
              We sent a verification code to {email}. Enter it below.
            </Text>

            <View className="mt-10 flex-1">
              <Text className="mb-2 text-sm font-bold text-slate-800">Verification Code</Text>
              <TextInput
                placeholder="Enter verification code"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
              />

              <Pressable
                onPress={handleVerify}
                disabled={loading || !code.trim()}
                className="rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700"
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-lg font-bold text-white">
                    Verify Email
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="relative z-10">
            <Pressable
              onPress={() => router.back()}
              className="mb-6 h-10 w-10 items-center justify-center rounded-full bg-violet-50 border border-violet-100"
            >
              <Ionicons name="chevron-back" size={22} color="#7c3aed" />
            </Pressable>

            <Text className="text-3xl font-bold text-slate-900">Create account</Text>
            <Text className="mt-2 text-sm font-medium text-slate-500">
              Join TaskLink and start getting things done
            </Text>

            <View className="mt-8">
              <Text className="mb-2 text-sm font-bold text-slate-800">Full Name</Text>
              <TextInput
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={setFullName}
                className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
              />

              <Text className="mb-2 text-sm font-bold text-slate-800">Email</Text>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
              />

              <Text className="mb-2 text-sm font-bold text-slate-800">Phone Number</Text>
              <TextInput
                placeholder="Enter your phone number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
              />

              <Text className="mb-2 text-sm font-bold text-slate-800">Password</Text>
              <View className="relative mb-2">
                <TextInput
                  placeholder="Create a password"
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
              <Text className="mb-6 text-xs text-slate-400">Must be at least 8 characters</Text>

              <Text className="mb-6 text-xs text-slate-400 leading-4">
                By signing up, you agree to our <Text className="font-bold text-violet-600">Terms of Service</Text> and <Text className="font-bold text-violet-600">Privacy Policy</Text>
              </Text>

              <Pressable
                onPress={handleSignUp}
                disabled={loading}
                className="rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700"
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-center text-lg font-bold text-white">
                    Create Account
                  </Text>
                )}
              </Pressable>

              <View className="mt-8 flex-row items-center justify-center">
                <View className="h-[1px] flex-1 bg-slate-200" />
                <Text className="mx-4 text-sm font-medium text-slate-400">or continue with</Text>
                <View className="h-[1px] flex-1 bg-slate-200" />
              </View>

              <View className="mt-5 gap-3">
                <Pressable
                  onPress={handleGoogleSignUp}
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

            <View className="mt-10 flex-row justify-center">
              <Text className="text-sm font-medium text-slate-500">Already have an account? </Text>
              <Pressable onPress={() => router.replace('/sign-in')}>
                <Text className="text-sm font-bold text-violet-600">Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
