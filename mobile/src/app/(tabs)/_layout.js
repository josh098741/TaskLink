import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

function TabIcon({ name, focused }) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? "#2563eb" : "#94a3b8"}
    />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs/index"
        options={{
          title: "Jobs",
          tabBarLabel: "Jobs",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="briefcase" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="post/index"
        options={{
          title: "Post",
          tabBarLabel: "Post",
          tabBarIcon: () => (
            <View className="-mt-6 h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-600/30">
              <Ionicons name="add" size={30} color="white" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="browse/index"
        options={{
          title: "Browse",
          tabBarLabel: "Browse",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="search" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
