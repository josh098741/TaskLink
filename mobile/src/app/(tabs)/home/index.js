import { View, Text, ScrollView, Pressable } from "react-native";

export default function Home() {
  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="px-6 pt-16 pb-10">
        <Text className="text-sm font-medium text-blue-600">Welcome back</Text>
        <Text className="mt-1 text-3xl font-bold text-slate-900">
          TaskLink
        </Text>
      </View>

      <View className="px-6">
        <Pressable className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <Text className="text-lg font-semibold text-slate-800">
            Today's tasks
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            You have 3 tasks due today.
          </Text>
        </Pressable>

        <Pressable className="mb-4 rounded-2xl bg-blue-600 p-5 shadow-sm">
          <Text className="text-lg font-semibold text-white">
            Start a focus session
          </Text>
          <Text className="mt-1 text-sm text-blue-100">
            Tap to begin a 25 minute timer.
          </Text>
        </Pressable>

        <View className="mb-4 rounded-2xl bg-emerald-100 p-5">
          <Text className="text-lg font-semibold text-emerald-800">
            Weekly goal reached
          </Text>
          <Text className="mt-1 text-sm text-emerald-700">
            Nice work staying consistent.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
