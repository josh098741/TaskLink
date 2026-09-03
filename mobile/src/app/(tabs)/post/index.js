import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function Post() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header with Create Post button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Posts</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/post-create')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Create Post</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.emptyState}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text-outline" size={40} color="#a5b4fc" />
          </View>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap {'"Create Post"'} to share your first task with Doers nearby.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = {
  safe: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.5,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e1b4b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
};
