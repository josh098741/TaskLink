import { View, Text, ScrollView, Pressable, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Browse() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-6 pb-6">
          <Text className="text-3xl font-bold text-slate-900">Browse</Text>
          <Text className="mt-1 text-sm text-slate-500">
            Find tasks and gigs near you.
          </Text>
        </View>

        {["Lawn mowing", "Tutoring", "Grocery run", "Dog walking"].map(
          (item) => (
            <Pressable
              key={item}
              className="mx-6 mb-3 flex-row items-center rounded-2xl bg-white p-4 shadow-sm"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Text className="text-sm font-bold text-blue-600">$12</Text>
              </View>
              <View className="ml-4">
                <Text className="text-base font-semibold text-slate-800">
                  {item}
                </Text>
                <Text className="text-xs text-slate-500">2 km away</Text>
              </View>
            </Pressable>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
