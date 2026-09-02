import { View, Text, TextInput, Pressable, SafeAreaView, Image, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function ForgotPassword() {
  const router = useRouter();
  const [emailSent, setEmailSent] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Background Image */}
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
          {/* Back Button */}
          <Pressable 
            onPress={() => router.back()} 
            className="mb-8 h-10 w-10 items-center justify-center rounded-full bg-violet-50 border border-violet-100"
          >
            <Ionicons name="chevron-back" size={22} color="#7c3aed" />
          </Pressable>

          {!emailSent ? (
            <>
              {/* Icon */}
              <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-violet-50">
                <Ionicons name="lock-closed-outline" size={36} color="#7c3aed" />
              </View>

              {/* Header */}
              <Text className="text-3xl font-bold text-slate-900">Forgot password?</Text>
              <Text className="mt-2 text-sm font-medium text-slate-500 leading-5">
                No worries, we&apos;ll send you reset instructions. Enter the email address linked to your account.
              </Text>

              {/* Form */}
              <View className="mt-10 flex-1">
                {/* Email Input */}
                <Text className="mb-2 text-sm font-bold text-slate-800">Email</Text>
                <TextInput
                  placeholder="Enter your email"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
                />

                {/* Reset Button */}
                <Pressable 
                  onPress={() => setEmailSent(true)}
                  className="rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700"
                >
                  <Text className="text-center text-lg font-bold text-white">
                    Reset Password
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* Success State */}
              <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-green-50">
                <Ionicons name="mail-outline" size={36} color="#16a34a" />
              </View>

              <Text className="text-3xl font-bold text-slate-900">Check your email</Text>
              <Text className="mt-2 text-sm font-medium text-slate-500 leading-5">
                We sent a password reset link to your email. Check your inbox and follow the instructions.
              </Text>

              <View className="mt-10 flex-1">
                <Pressable 
                  onPress={() => router.replace('/sign-in')}
                  className="rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700"
                >
                  <Text className="text-center text-lg font-bold text-white">
                    Back to Sign In
                  </Text>
                </Pressable>

                <Pressable 
                  onPress={() => setEmailSent(false)}
                  className="mt-4 py-4"
                >
                  <Text className="text-center text-sm font-bold text-violet-600">
                    Didn&apos;t receive the email? Try again
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Footer */}
          <View className="mt-auto flex-row justify-center">
            <Text className="text-sm font-medium text-slate-500">Remember your password? </Text>
            <Pressable onPress={() => router.replace('/sign-in')}>
              <Text className="text-sm font-bold text-violet-600">Sign in</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
