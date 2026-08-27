import { Tabs } from "expo-router";
import { View, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function TabIcon({ name, focused }) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? "#2563eb" : "#94a3b8"}
    />
  );
}

function CurvedTabBarBackground({ height }) {
  const centerX = SCREEN_WIDTH / 2;
  const curveWidth = 90; // total horizontal span of the dip
  const curveDepth = 34; // how far the curve dips down

  const path = `
    M0,0
    H${centerX - curveWidth / 2}
    C${centerX - curveWidth / 4},0 ${centerX - curveWidth / 2.5},${curveDepth} ${centerX},${curveDepth}
    C${centerX + curveWidth / 2.5},${curveDepth} ${centerX + curveWidth / 4},0 ${centerX + curveWidth / 2},0
    H${SCREEN_WIDTH}
    V${height}
    H0
    Z
  `;

  return (
    <Svg
      width={SCREEN_WIDTH}
      height={height}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <Path d={path} fill="white" stroke="#e2e8f0" strokeWidth={1} />
    </Svg>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 64 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <CurvedTabBarBackground height={tabBarHeight} />
        ),
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
          tabBarLabel: "",
          tabBarIcon: () => (
            <View
              style={{
                marginTop: -30,
                height: 56,
                width: 56,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#2563eb",
                shadowColor: "#2563eb",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
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