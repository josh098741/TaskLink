import { View, Text, TextInput, Pressable, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';

export default function SignIn() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-6 pb-10">
        {/* Back Button */}
        <Pressable 
          onPress={() => router.push('/onboarding')} 
          className="mb-8 h-10 w-10 justify-center"
        >
          <Ionicons name="chevron-back" size={28} color="black" />
        </Pressable>

        {/* Header */}
        <Text className="text-3xl font-bold text-slate-900">Welcome back 👋</Text>
        <Text className="mt-2 text-sm font-medium text-slate-500">
          Login to continue to your account
        </Text>

        {/* Form */}
        <View className="mt-10 flex-1">
          {/* Email/Phone Input */}
          <Text className="mb-2 text-sm font-bold text-slate-800">Email or Phone Number</Text>
          <TextInput
            placeholder="Enter your email or phone"
            placeholderTextColor="#94a3b8"
            className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-900"
          />

          {/* Password Input */}
          <Text className="mb-2 text-sm font-bold text-slate-800">Password</Text>
          <View className="relative">
            <TextInput
              placeholder="Enter your password"
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

          {/* Forgot Password */}
          <Pressable className="mt-3 self-end">
            <Text className="text-sm font-bold text-violet-600">Forgot password?</Text>
          </Pressable>

          {/* Log In Button */}
          <Pressable className="mt-8 rounded-2xl bg-violet-600 py-4 shadow-sm shadow-violet-600/30 active:bg-violet-700">
            <Text className="text-center text-lg font-bold text-white">
              Log In
            </Text>
          </Pressable>

          {/* Divider */}
          <View className="mt-10 flex-row items-center justify-center">
            <View className="h-[1px] flex-1 bg-slate-200" />
            <Text className="mx-4 text-sm font-medium text-slate-400">or continue with</Text>
            <View className="h-[1px] flex-1 bg-slate-200" />
          </View>

          {/* Social Login */}
          <View className="mt-6 flex-row justify-center gap-4">
            <Pressable className="flex-1 flex-row items-center justify-center rounded-2xl border border-slate-200 bg-white py-3.5">
              <View className="mr-3">
                <FontAwesome name="google" size={20} color="#DB4437" />
              </View>
              <Text className="text-base font-bold text-slate-800">Google</Text>
            </Pressable>
          </View>
          
        </View>
        
        {/* Footer */}
        <View className="mt-auto flex-row justify-center">
          <Text className="text-sm font-medium text-slate-500">Don't have an account? </Text>
          <Pressable>
            <Text className="text-sm font-bold text-violet-600">Sign up</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
