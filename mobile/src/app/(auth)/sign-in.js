import { View, Text, TextInput, Pressable } from "react-native";

export default function SignIn() {
  return (
    <View className="flex-1 bg-white px-8 pt-24">
      <Text className="text-3xl font-bold text-slate-900">Sign in</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Welcome back to TaskLink.
      </Text>

      <View className="mt-10">
        <TextInput
          placeholder="Email"
          className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800"
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800"
        />

        <Pressable className="rounded-xl bg-blue-600 py-3.5">
          <Text className="text-center text-base font-semibold text-white">
            Continue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
