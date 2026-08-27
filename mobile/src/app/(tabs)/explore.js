import { View, Text, ScrollView } from "react-native";

export default function Explore() {
  return (
    <ScrollView className="flex-1 bg-slate-100">
      <View className="px-6 pt-16 pb-6">
        <Text className="text-3xl font-bold text-slate-900">Explore</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Discover teams and projects.
        </Text>
      </View>

      <View className="flex-row flex-wrap justify-between px-6">
        {["Design", "Engineering", "Marketing", "Research"].map((item) => (
          <View
            key={item}
            className="mb-4 w-[48%] rounded-2xl bg-white p-5 shadow-sm"
          >
            <Text className="text-base font-semibold text-slate-800">
              {item}
            </Text>
            <View className="mt-3 h-2 w-3/4 rounded-full bg-slate-200" />
            <View className="mt-2 h-2 w-1/2 rounded-full bg-slate-200" />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
