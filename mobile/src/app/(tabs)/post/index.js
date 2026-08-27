import { View, Text, Pressable, TextInput } from "react-native";

export default function Post() {
  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Text className="text-3xl font-bold text-slate-900">Create a post</Text>
      <Text className="mt-1 text-sm text-slate-500">
        Share a task or opportunity.
      </Text>

      <View className="mt-8">
        <TextInput
          placeholder="Title"
          className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800"
        />
        <TextInput
          placeholder="Describe what you need..."
          multiline
          numberOfLines={4}
          className="mb-6 h-32 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800"
        />

        <Pressable className="rounded-xl bg-blue-600 py-3.5">
          <Text className="text-center text-base font-semibold text-white">
            Publish
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
