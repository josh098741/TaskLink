import { View, Text, ScrollView, Pressable } from "react-native";

export default function Jobs() {
  return (
    <ScrollView className="flex-1 bg-slate-100">
      <View className="px-6 pt-16 pb-6">
        <Text className="text-3xl font-bold text-slate-900">Jobs</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Track your active and past jobs.
        </Text>
      </View>

      <View className="px-6">
        <View className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <Text className="text-xs font-semibold text-emerald-600">
            IN PROGRESS
          </Text>
          <Text className="mt-1 text-lg font-semibold text-slate-800">
            Website redesign
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            Due in 3 days · $250
          </Text>
        </View>

        <View className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <Text className="text-xs font-semibold text-slate-400">COMPLETED</Text>
          <Text className="mt-1 text-lg font-semibold text-slate-800">
            Logo animation
          </Text>
          <Text className="mt-1 text-sm text-slate-500">Paid · $80</Text>
        </View>
      </View>
    </ScrollView>
  );
}
