import { View, Text, ScrollView, Pressable } from "react-native";

export default function Settings() {
  const items = [
    "Account",
    "Notifications",
    "Privacy",
    "Help & Support",
    "Log out",
  ];

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="px-6 pt-16 pb-6">
        <Text className="text-3xl font-bold text-slate-900">Settings</Text>
      </View>

      <View className="px-6">
        {items.map((item) => (
          <Pressable
            key={item}
            className="mb-3 flex-row items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm"
          >
            <Text className="text-base font-medium text-slate-800">
              {item}
            </Text>
            <Text className="text-slate-400">›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
