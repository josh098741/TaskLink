import { Stack } from 'expo-router';
import { PostProvider } from '../../config/usePostStore';

export default function PostCreateLayout() {
  return (
    <PostProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="step1" />
        <Stack.Screen name="step2" />
        <Stack.Screen name="step3" />
        <Stack.Screen name="step4" />
        <Stack.Screen name="step5" />
        <Stack.Screen name="step6" />
        <Stack.Screen name="step7" />
      </Stack>
    </PostProvider>
  );
}
