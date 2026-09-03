import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClerk, useUser, useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../../config/api';

const ROLE_LABELS = {
  tasker: 'Tasker (Work & Earn)',
  poster: 'Task Poster (Hire Help)',
};

export default function SettingsScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Settings toggles
  const [availableForWork, setAvailableForWork] = useState(true);
  const [taskAlerts, setTaskAlerts] = useState(true);
  const [bidNotifications, setBidNotifications] = useState(true);
  const [smsReceipts, setSmsReceipts] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await getToken({ skipCache: true }).catch(() => null);
      if (token) {
        const data = await apiFetch('/user/me', token).catch(() => null);
        if (data) {
          setUserData(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch profile in settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of TaskLink?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/');
            } catch (err) {
              console.log('Logout failed', err);
            }
          },
        },
      ]
    );
  };

  const handleSwitchRole = async () => {
    if (!userData) return;
    const currentRole = userData.role || 'tasker';
    const newRole = currentRole === 'tasker' ? 'poster' : 'tasker';

    Alert.alert(
      'Switch Mode',
      `Switch your active mode to ${ROLE_LABELS[newRole]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            setUpdating(true);
            try {
              const token = await getToken().catch(() => null);
              await apiFetch('/user/onboarding', token, {
                method: 'PUT',
                headers: { 'x-clerk-user-id': user?.id },
                body: JSON.stringify({
                  clerkId: user?.id,
                  role: newRole,
                  phoneNumber: userData.phoneNumber || '+254700000000',
                  firstName: userData.firstName || user?.firstName || 'User',
                  lastName: userData.lastName || user?.lastName || '',
                  location: userData.location || 'Juja, Kiambu',
                  categories: userData.categories || ['cleaning'],
                }),
              });
              setUserData((prev) => ({ ...prev, role: newRole }));
            } catch (err) {
              Alert.alert('Error', 'Failed to update role. Please try again.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const displayName =
    [userData?.firstName || user?.firstName, userData?.lastName || user?.lastName]
      .filter(Boolean)
      .join(' ') || 'TaskLink Member';

  const userRole = userData?.role || 'tasker';
  const locationDisplay = userData?.location || 'Juja, Kiambu';
  const phoneDisplay = userData?.phoneNumber || '+254 701 903 833';
  const categoryCount = userData?.categories?.length || 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: 12 }]}>
        <Text style={styles.headerTitle}>TaskLink Settings</Text>
        <View style={styles.badgePro}>
          <Ionicons name="shield-checkmark" size={13} color="#4f46e5" />
          <Text style={styles.badgeProText}>Verified Member</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 96 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User Profile Card ───────────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileGradient}
          >
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrapper}>
                {user?.imageUrl ? (
                  <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={32} color="#4f46e5" />
                  </View>
                )}
                <View style={styles.verifiedDot}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{displayName}</Text>
                <Text style={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress || 'Member'}</Text>
                <View style={styles.roleTag}>
                  <Ionicons
                    name={userRole === 'poster' ? 'clipboard-outline' : 'briefcase-outline'}
                    size={12}
                    color="#fff"
                  />
                  <Text style={styles.roleTagText}>
                    {userRole === 'poster' ? 'Task Poster' : 'Tasker Pro'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Sub-info bar */}
            <View style={styles.profileSubRow}>
              <View style={styles.subItem}>
                <Ionicons name="location" size={14} color="#e0e7ff" />
                <Text style={styles.subText}>{locationDisplay}</Text>
              </View>
              <View style={styles.subDivider} />
              <View style={styles.subItem}>
                <Ionicons name="call" size={14} color="#e0e7ff" />
                <Text style={styles.subText}>{phoneDisplay}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Quick Mode Switcher Banner */}
          <TouchableOpacity
            style={styles.switchBanner}
            onPress={handleSwitchRole}
            activeOpacity={0.8}
            disabled={updating}
          >
            <View style={styles.switchIconCircle}>
              <Ionicons name="swap-horizontal" size={18} color="#4f46e5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>
                Active Mode: {userRole === 'poster' ? 'Posting Tasks' : 'Tasker (Working)'}
              </Text>
              <Text style={styles.switchSubtitle}>
                Tap to switch to {userRole === 'poster' ? 'Tasker Mode' : 'Poster Mode'}
              </Text>
            </View>
            {updating ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Section: Work & Task Preferences ──────────────────────────── */}
        <Text style={styles.sectionHeader}>TaskLink Work & Preferences</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/setup/profile')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="location-outline" size={20} color="#4f46e5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Operating Location</Text>
              <Text style={styles.menuValue}>{locationDisplay}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/setup/categories')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="grid-outline" size={20} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Skills & Task Categories</Text>
              <Text style={styles.menuValue}>
                {categoryCount > 0 ? `${categoryCount} categories active` : 'Select your skills'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>

          {userRole === 'tasker' && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.menuRow}>
                <View style={[styles.menuIconBox, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="radio-outline" size={20} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>Available for Tasks</Text>
                  <Text style={styles.menuValue}>
                    {availableForWork ? 'Online — Receiving task alerts in your area' : 'Offline'}
                  </Text>
                </View>
                <Switch
                  value={availableForWork}
                  onValueChange={setAvailableForWork}
                  trackColor={{ false: '#e2e8f0', true: '#818cf8' }}
                  thumbColor={availableForWork ? '#4f46e5' : '#f8fafc'}
                />
              </View>
            </>
          )}
        </View>

        {/* ── Section: Payments & M-Pesa ──────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Payments & M-Pesa Wallet</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="cash-outline" size={20} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>M-Pesa Payout Number</Text>
              <Text style={styles.menuValue}>{phoneDisplay} (Verified)</Text>
            </View>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="wallet-outline" size={20} color="#0284c7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Transaction History</Text>
              <Text style={styles.menuValue}>Completed task payouts & receipts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* ── Section: Task Notifications ────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Alerts & Notifications</Text>
        <View style={styles.cardGroup}>
          <View style={styles.menuRow}>
            <View style={[styles.menuIconBox, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="notifications-outline" size={20} color="#9333ea" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Local Task Alerts</Text>
              <Text style={styles.menuValue}>Notify when new tasks open in {locationDisplay}</Text>
            </View>
            <Switch
              value={taskAlerts}
              onValueChange={setTaskAlerts}
              trackColor={{ false: '#e2e8f0', true: '#818cf8' }}
              thumbColor={taskAlerts ? '#4f46e5' : '#f8fafc'}
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.menuRow}>
            <View style={[styles.menuIconBox, { backgroundColor: '#ffedd5' }]}>
              <Ionicons name="chatbubbles-outline" size={20} color="#ea580c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Bids & Messages</Text>
              <Text style={styles.menuValue}>Push notifications for bids & client chats</Text>
            </View>
            <Switch
              value={bidNotifications}
              onValueChange={setBidNotifications}
              trackColor={{ false: '#e2e8f0', true: '#818cf8' }}
              thumbColor={bidNotifications ? '#4f46e5' : '#f8fafc'}
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.menuRow}>
            <View style={[styles.menuIconBox, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="phone-portrait-outline" size={20} color="#4f46e5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>SMS Confirmations</Text>
              <Text style={styles.menuValue}>Receive M-Pesa & task receipts via SMS</Text>
            </View>
            <Switch
              value={smsReceipts}
              onValueChange={setSmsReceipts}
              trackColor={{ false: '#e2e8f0', true: '#818cf8' }}
              thumbColor={smsReceipts ? '#4f46e5' : '#f8fafc'}
            />
          </View>
        </View>

        {/* ── Section: Safety & Support ────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Trust & Support</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#dc2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>TaskLink Trust & Safety</Text>
              <Text style={styles.menuValue}>Community rules & verified tasker policies</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="help-circle-outline" size={20} color="#4f46e5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Help Center & Live Chat</Text>
              <Text style={styles.menuValue}>24/7 customer support & dispute resolution</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* ── Log Out Button ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>Log Out of TaskLink</Text>
        </TouchableOpacity>

        <Text style={styles.appFooter}>
          TaskLink v1.0.4 · Built for Kenya & East Africa 🇰🇪
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.5,
  },
  badgePro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeProText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  // Profile Card
  profileCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  profileGradient: {
    padding: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: '#e0e7ff',
    marginTop: 2,
  },
  roleTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 8,
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  subText: {
    fontSize: 12.5,
    color: '#e0e7ff',
    fontWeight: '500',
  },
  subDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },
  switchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  switchIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  switchSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  // Section Headers & Card Groups
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1e1b4b',
  },
  menuValue: {
    fontSize: 12.5,
    color: '#6b7280',
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  appFooter: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 12,
  },
});
