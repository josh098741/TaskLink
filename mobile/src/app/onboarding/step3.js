import { View, Text, Image, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingStep3() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Top Bar with Skip */}
      <View className="w-full items-end px-6 mt-2">
        <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
          <Text className="text-indigo-600 font-bold text-lg">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Icon & Text */}
      <View className="px-6 items-center mt-2">
        <View className="w-16 h-16 rounded-full bg-indigo-50 items-center justify-center mb-3">
          <Ionicons name="people" size={36} color="#4f46e5" />
        </View>
        
        <Text className="text-2xl font-extrabold text-center text-slate-900 mb-2 tracking-tight">
          Choose the best Tasker
        </Text>
        <Text className="text-center text-slate-500 text-base leading-5 px-2">
          Review profiles, ratings and reviews. Hire with confidence.
        </Text>
      </View>

      {/* Illustration */}
      <View className="flex-1 w-full items-center justify-center mt-2">
        <Image 
          source={require('../../../assets/images/onboarding_3.png')} 
          className="w-full h-full"
          resizeMode="contain"
        />
      </View>

      {/* Dots & Buttons */}
      <View className="px-6 pb-2 pt-2 w-full">
        <View className="flex-row gap-2 justify-center mb-4">
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
        </View>

        <TouchableOpacity 
          className="bg-indigo-600 py-3.5 rounded-xl items-center"
          onPress={() => router.push('/onboarding/step4')}
        >
          <Text className="text-white font-bold text-lg">Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="py-2 mt-1 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-gray-500 font-bold text-lg">Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
