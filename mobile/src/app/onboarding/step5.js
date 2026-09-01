import { View, Text, Image, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingStep5() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Keep spacing but no Skip button for the final step */}
      <View className="w-full items-end px-6 mt-6 h-6">
      </View>

      {/* Icon & Text */}
      <View className="px-6 items-center mt-2">
        <View className="w-16 h-16 rounded-full bg-indigo-50 items-center justify-center mb-3">
          <Ionicons name="star" size={36} color="#4f46e5" />
        </View>
        
        <Text className="text-2xl font-extrabold text-center text-slate-900 mb-2 tracking-tight">
          Build your reputation
        </Text>
        <Text className="text-center text-slate-500 text-base leading-5 px-2">
          Rate each other and build trust. More jobs. More opportunities.
        </Text>
      </View>

      {/* Illustration */}
      <View className="flex-1 w-full items-center justify-center mt-2">
        <Image 
          source={require('../../../assets/images/onboarding_5.png')} 
          className="w-full h-full"
          resizeMode="contain"
        />
      </View>

      {/* Bottom Safe Badge */}
      <View className="px-6 flex-row items-center justify-center mb-4 mt-2">
        <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center mr-3">
          <Ionicons name="shield-checkmark-outline" size={20} color="#4f46e5" />
        </View>
        <View>
          <Text className="text-indigo-600 font-bold text-base">Safe. Trusted. Local.</Text>
          <Text className="text-slate-500 text-xs">Powered by <Text className="font-bold text-indigo-600">TaskLink</Text></Text>
        </View>
      </View>

      {/* Button & Dots */}
      <View className="px-6 pb-4 pt-2 w-full">
        <TouchableOpacity 
          className="bg-indigo-600 py-3.5 rounded-xl items-center mb-6"
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          <Text className="text-white font-bold text-lg">Let&apos;s Go!</Text>
        </TouchableOpacity>

        <View className="flex-row gap-3 justify-center mb-2">
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
        </View>
      </View>
    </SafeAreaView>
  );
}
