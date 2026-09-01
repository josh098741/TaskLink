import { View, Text, Image, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { router } from 'expo-router';

export default function OnboardingStep1() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Top Logo */}
      <View className="flex-row items-center justify-center mt-20 mb-4">
        <Image 
          source={require('../../../assets/images/tasklink.png')} 
          className="w-16 h-16"
          resizeMode="contain"
        />
        <Text className="text-slate-900 font-extrabold text-4xl ml-2">Task</Text>
        <Text className="text-indigo-600 font-extrabold text-4xl">Link</Text>
      </View>

      {/* Illustration */}
      <View className="flex-1 items-center justify-center w-full px-4">
        <Image 
          source={require('../../../assets/images/onboarding_1.png')} 
          className="w-full h-80"
          resizeMode="contain"
        />
      </View>

      {/* Text Content */}
      <View className="px-6 items-center mt-2">
        <Text className="text-3xl font-extrabold text-center text-slate-900 mb-4 tracking-tight">
          Get things done.{'\n'}Find work. Earn more.
        </Text>
        <Text className="text-center text-slate-500 mb-6 text-base leading-6 px-4">
          TaskLink connects people who need tasks done with trusted Taskers in their neighborhood.
        </Text>

        {/* Pagination Dots */}
        <View className="flex-row gap-2 mb-8">
          <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200" />
        </View>
      </View>

      {/* Bottom Buttons */}
      <View className="px-6 pb-6 w-full">
        <TouchableOpacity 
          className="bg-indigo-600 py-4 rounded-xl items-center mb-6"
          onPress={() => router.push('/onboarding/step2')}
        >
          <Text className="text-white font-bold text-lg">Get Started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center pb-2"
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          <Text className="text-slate-500 font-medium text-base">
            Already have an account? <Text className="text-indigo-600 font-bold">Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
