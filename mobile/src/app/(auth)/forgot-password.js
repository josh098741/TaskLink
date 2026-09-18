import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function ForgotPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { forgotPassword, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setStep('code');
    } catch (err) {
      const clean = (err?.message || "Could not send reset code").replace(/^Error:\s*/, "");
      Alert.alert("Couldn't send code", clean);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim() || !newPassword.trim()) {
      Alert.alert("Error", "Please enter the code and a new password");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      Alert.alert("Success", "Password updated. Please sign in.", [
        { text: "OK", onPress: () => router.replace('/sign-in') },
      ]);
    } catch (err) {
      const clean = (err?.message || "Invalid or expired reset code").replace(/^Error:\s*/, "");
      Alert.alert("Reset failed", clean);
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
            <Pressable onPress={() => router.back()} className="mb-8 h-10 w-10 items-center justify-center rounded-full bg-violet-50 border border-violet-100">
              <Ionicons name="chevron-back" size={22} color="#7c3aed" />
            </Pressable>
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-violet-50">
              <Ionicons name="lock-closed-outline" size={36} color="#7c3aed" />
            </View>
            <Text className="text-3xl font-bold text-slate-900">Forgot password?</Text>
            <Text className="mt-2 text-sm font-medium text-slate-500 leading-5">
              No worries, we will send you reset instructions. Enter the email address linked to your account.
            </Text>

            <View className="mt-10">
              {step === 'email' ? (
                <>
                  <Text className="mb-2 text-sm font-bold text-slate-800">Email</Text>
                  <TextInput placeholder="Enter your email" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900" />
                  <Pressable onPress={handleSendCode} disabled={loading} className="rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700">
                    {loading ? (<ActivityIndicator color="#ffffff" />) : (<Text className="text-center text-lg font-bold text-white">Send Reset Code</Text>)}
                  </Pressable>
                </>
              ) : (
                <>
                  <Text className="mb-2 text-sm font-bold text-slate-800">Reset Code</Text>
                  <TextInput placeholder="Enter the 6-digit code" placeholderTextColor="#94a3b8" value={code} onChangeText={setCode} className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900" />

                  <Text className="mb-2 text-sm font-bold text-slate-800">New Password</Text>
                  <TextInput placeholder="Create a new password" placeholderTextColor="#94a3b8" secureTextEntry value={newPassword} onChangeText={setNewPassword} className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900" />
                  <Text className="mb-6 text-xs text-slate-400">Must be at least 8 characters</Text>

                  <View className="flex-row gap-3">
                    <Pressable onPress={() => setStep('email')} className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 active:bg-slate-50">
                      <Text className="text-center text-base font-bold text-slate-700">Back</Text>
                    </Pressable>
                    <Pressable onPress={handleSubmit} disabled={loading} className="flex-1 rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700">
                      {loading ? (<ActivityIndicator color="#ffffff" />) : (<Text className="text-center text-lg font-bold text-white">Reset Password</Text>)}
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}