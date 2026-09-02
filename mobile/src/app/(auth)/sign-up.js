import { View, Text, TextInput, Pressable, SafeAreaView, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';

export default function SignUp() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

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
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="relative z-10">
            {/* Back Button */}
            <Pressable 
              onPress={() => router.back()} 
              className="mb-6 h-10 w-10 items-center justify-center rounded-full bg-violet-50 border border-violet-100"
            >
              <Ionicons name="chevron-back" size={22} color="#7c3aed" />
            </Pressable>

            {/* Header */}
            <Text className="text-3xl font-bold text-slate-900">Create account</Text>
            <Text className="mt-2 text-sm font-medium text-slate-500">
              Join TaskLink and start getting things done
            </Text>

            {/* Form */}
            <View className="mt-8">
              {/* Full Name */}
              <Text className="mb-2 text-sm font-bold text-slate-800">Full Name</Text>
              <TextInput
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
              />

              {/* Email */}
              <Text className="mb-2 text-sm font-bold text-slate-800">Email</Text>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
              />

              {/* Phone Number */}
              <Text className="mb-2 text-sm font-bold text-slate-800">Phone Number</Text>
              <TextInput
                placeholder="Enter your phone number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
              />

              {/* Password */}
              <Text className="mb-2 text-sm font-bold text-slate-800">Password</Text>
              <View className="relative mb-2">
                <TextInput
                  placeholder="Create a password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
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

              {/* Terms */}
              <Text className="mb-6 text-xs text-slate-400 leading-4">
                By signing up, you agree to our <Text className="font-bold text-violet-600">Terms of Service</Text> and <Text className="font-bold text-violet-600">Privacy Policy</Text>
              </Text>

              {/* Sign Up Button */}
              <Pressable className="rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700">
                <Text className="text-center text-lg font-bold text-white">
                  Create Account
                </Text>
              </Pressable>

              {/* Divider */}
              <View className="mt-8 flex-row items-center justify-center">
                <View className="h-[1px] flex-1 bg-slate-200" />
                <Text className="mx-4 text-sm font-medium text-slate-400">or continue with</Text>
                <View className="h-[1px] flex-1 bg-slate-200" />
              </View>

              {/* Social Login */}
              <View className="mt-5 gap-3">
                <Pressable className="flex-row items-center justify-center rounded-xl border border-slate-200 bg-white py-3.5 shadow-sm shadow-slate-200/50 active:bg-slate-50">
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

            {/* Footer */}
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
