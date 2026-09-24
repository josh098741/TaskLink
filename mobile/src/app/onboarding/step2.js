import { View, Text, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function OnboardingStep2() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  return (
    <SafeAreaView
      className={`${isDark ? 'dark ' : ''}flex-1 bg-white dark:bg-slate-950`}
      style={{ backgroundColor: colors.background }}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {/* Top Bar with Skip */}
      <View className="w-full items-end px-6 mt-10">
        <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
          <Text className="text-indigo-600 font-bold text-lg">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Icon & Text */}
      <View className="px-6 items-center mt-2">
        <View className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 items-center justify-center mb-3">
          <Ionicons name="clipboard" size={32} color="#4f46e5" />
        </View>
        
        <Text className="text-2xl font-extrabold text-center text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
          Post a task in minutes
        </Text>
        <Text className="text-center text-slate-500 dark:text-slate-400 text-base leading-5 px-2">
          Tell us what you need, set your budget and location. We&apos;ll bring the right people to you.
        </Text>
      </View>

      {/* Illustration */}
      <View className="flex-1 w-full items-center justify-center mt-2">
        <Image 
          source={require('../../../assets/images/onboarding_2.png')} 
          className="w-full h-full"
          resizeMode="contain"
        />
      </View>

      {/* Dots & Buttons */}
      <View className="px-6 pb-2 pt-2 w-full" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <View className="flex-row gap-2 justify-center mb-4">
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-slate-700" />
          <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-slate-700" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-slate-700" />
          <View className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-slate-700" />
        </View>

        <TouchableOpacity 
          className="bg-indigo-600 py-3.5 rounded-xl items-center"
          onPress={() => router.push('/onboarding/step3')}
        >
          <Text className="text-white font-bold text-lg">Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="py-2 mt-1 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-gray-500 dark:text-slate-400 font-bold text-lg">Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
