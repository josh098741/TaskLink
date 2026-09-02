import { View, Text, TextInput, Pressable, SafeAreaView, Image, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useSignIn } from '@clerk/expo';

export default function ForgotPassword() {
  const router = useRouter();
  const { isLoaded, signIn } = useSignIn();

  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!isLoaded || !signIn) return;

    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setStep('code');
    } catch (err) {
      Alert.alert("Error", err.errors?.[0]?.message || "Could not send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn) return;

    if (!resetCode.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode.trim(),
      });

      if (result.status === "reset_password") {
        setStep('newPassword');
      }
    } catch (err) {
      Alert.alert("Error", err.errors?.[0]?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    if (!isLoaded || !signIn) return;

    if (!newPassword.trim()) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }

    if (newPassword.trim().length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.resetPassword({
        password: newPassword.trim(),
      });

      if (result.status === "complete") {
        setEmailSent(true);
      }
    } catch (err) {
      Alert.alert("Error", err.errors?.[0]?.message || "Could not reset password");
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
            onPress={() => router.back()}
            className="mb-8 h-10 w-10 items-center justify-center rounded-full bg-violet-50 border border-violet-100"
          >
            <Ionicons name="chevron-back" size={22} color="#7c3aed" />
          </Pressable>

          {step === 'email' && (
            <>
              <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-violet-50">
                <Ionicons name="lock-closed-outline" size={36} color="#7c3aed" />
              </View>

              <Text className="text-3xl font-bold text-slate-900">Forgot password?</Text>
              <Text className="mt-2 text-sm font-medium text-slate-500 leading-5">
                No worries, we&apos;ll send you reset instructions. Enter the email address linked to your account.
              </Text>

              <View className="mt-10 flex-1">
                <Text className="mb-2 text-sm font-bold text-slate-800">Email</Text>
                <TextInput
                  placeholder="Enter your email"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
                />

                <Pressable
                  onPress={handleResetPassword}
                  disabled={loading}
                  className="rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700"
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-center text-lg font-bold text-white">
                      Send Reset Code
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}

          {step === 'code' && (
            <>
              <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-violet-50">
                <Ionicons name="mail-outline" size={36} color="#7c3aed" />
              </View>

              <Text className="text-3xl font-bold text-slate-900">Check your email</Text>
              <Text className="mt-2 text-sm font-medium text-slate-500 leading-5">
                We sent a verification code to {email}. Enter it below.
              </Text>

              <View className="mt-10 flex-1">
                <Text className="mb-2 text-sm font-bold text-slate-800">Verification Code</Text>
                <TextInput
                  placeholder="Enter verification code"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  value={resetCode}
                  onChangeText={setResetCode}
                  className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
                />

                <Pressable
                  onPress={handleVerifyCode}
                  disabled={loading}
                  className="rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700"
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-center text-lg font-bold text-white">
                      Verify Code
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setStep('email')}
                  className="mt-4 py-4"
                >
                  <Text className="text-center text-sm font-bold text-violet-600">
                    Didn&apos;t receive the email? Try again
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-violet-50">
                <Ionicons name="key-outline" size={36} color="#7c3aed" />
              </View>

              <Text className="text-3xl font-bold text-slate-900">Set new password</Text>
              <Text className="mt-2 text-sm font-medium text-slate-500 leading-5">
                Enter your new password below. It must be at least 8 characters.
              </Text>

              <View className="mt-10 flex-1">
                <Text className="mb-2 text-sm font-bold text-slate-800">New Password</Text>
                <TextInput
                  placeholder="Enter new password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  className="mb-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
                />

                <Pressable
                  onPress={handleSetNewPassword}
                  disabled={loading}
                  className="rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700"
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-center text-lg font-bold text-white">
                      Reset Password
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}

          {emailSent && (
            <>
              <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-green-50">
                <Ionicons name="checkmark-circle-outline" size={36} color="#16a34a" />
              </View>

              <Text className="text-3xl font-bold text-slate-900">Password reset!</Text>
              <Text className="mt-2 text-sm font-medium text-slate-500 leading-5">
                Your password has been successfully reset. You can now sign in with your new password.
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
              </View>
            </>
          )}

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
