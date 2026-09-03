import { View, Text, TouchableOpacity, StatusBar, Image } from 'react-native';
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

      {/* Empty state content */}
      <View style={styles.content}>
        <Image
          source={require('../../../../assets/images/post-background.png')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>No Posts yet</Text>
        <Text style={styles.emptySubtitle}>
          Looks like you have not shared any task yet. Be the first to post and connect
          with doers nearby.
        </Text>

        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push('/post-create')}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.ctaBtnText}>Create your first post</Text>
        </TouchableOpacity>

        {/* Or divider */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        <TouchableOpacity
          style={styles.exploreBtn}
          onPress={() => router.navigate('/(tabs)/jobs')}
          activeOpacity={0.8}
        >
          <Ionicons name="briefcase-outline" size={18} color="#4f46e5" />
          <Text style={styles.exploreText}>Explore Tasks</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  image: {
    width: 220,
    height: 220,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e1b4b',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14.5,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 26,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    alignSelf: 'stretch',
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  orText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    marginHorizontal: 14,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    gap: 8,
  },
  exploreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4f46e5',
  },
};
