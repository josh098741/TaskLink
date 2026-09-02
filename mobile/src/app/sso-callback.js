import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

export default function SSOCallback() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/home');
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#7c3aed" />
    </View>
  );
}
