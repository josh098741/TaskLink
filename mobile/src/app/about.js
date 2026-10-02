import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Share,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../theme/themeStyles';
import {
  APP_NAME,
  APP_VERSION_LABEL,
  SUPPORT_EMAIL,
  WEBSITE_URL,
  formatBuildLabel,
} from '../constants/appInfo';

const HOW_IT_WORKS = [
  {
    icon: 'clipboard-outline',
    tint: '#4f46e5',
    tintBg: '#e0e7ff',
    title: 'Post a task',
    body: 'Describe what needs doing, set your budget and choose the exact area you operate in.',
  },
  {
    icon: 'people-outline',
    tint: '#7c3aed',
    tintBg: '#ede9fe',
    title: 'Get matched',
    body: 'Nearby verified taskers send bids. Compare reviews, rates and availability before you decide.',
  },
  {
    icon: 'wallet-outline',
    tint: '#16a34a',
    tintBg: '#dcfce7',
    title: 'Pay with M-Pesa',
    body: 'Funds move securely through M-Pesa. Both sides get SMS receipts the moment work is confirmed.',
  },
  {
    icon: 'star-outline',
    tint: '#d97706',
    tintBg: '#fef3c7',
    title: 'Rate the work',
    body: 'Every completed job builds a public trust score that keeps the community honest.',
  },
];

const FEATURES = [
  { icon: 'navigate-outline', label: 'Location-aware matching in your area' },
  { icon: 'cash-outline', label: 'Built-in M-Pesa payments & receipts' },
  { icon: 'shield-checkmark-outline', label: 'Verified taskers and trust scores' },
  { icon: 'chatbubble-ellipses-outline', label: 'In-app chat and live bid updates' },
  { icon: 'notifications-outline', label: 'Alerts the moment a task opens nearby' },
  { icon: 'moon-outline', label: 'Light and dark themes' },
];

const VALUES = [
  {
    icon: 'lock-closed-outline',
    title: 'Trust first',
    body: 'Verification, ratings and clear policies protect every member of the community.',
  },
  {
    icon: 'flash-outline',
    title: 'Built locally',
    body: 'Made for Kenya and East Africa, with M-Pesa and local task habits at the core.',
  },
  {
    icon: 'wallet-outline',
    title: 'Fair earnings',
    body: 'Transparent pricing for clients and reliable payouts for the people doing the work.',
  },
];

const LINKS = [
  {
    label: 'Trust & Safety',
    url: `${WEBSITE_URL}/trust`,
    icon: 'shield-checkmark-outline',
    tint: '#dc2626',
    tintBg: '#fee2e2',
  },
  {
    label: 'Help Center',
    url: `${WEBSITE_URL}/help`,
    icon: 'help-circle-outline',
    tint: '#4f46e5',
    tintBg: '#e0e7ff',
  },
  {
    label: 'Website',
    url: WEBSITE_URL,
    icon: 'globe-outline',
    tint: '#16a34a',
    tintBg: '#dcfce7',
  },
  {
    label: 'Terms of Service',
    url: `${WEBSITE_URL}/terms`,
    icon: 'document-text-outline',
    tint: '#0284c7',
    tintBg: '#e0f2fe',
  },
  {
    label: 'Privacy Policy',
    url: `${WEBSITE_URL}/privacy`,
    icon: 'lock-closed-outline',
    tint: '#7c3aed',
    tintBg: '#ede9fe',
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const { isDark, colors } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const insets = useSafeAreaInsets();

  const buildLabel = formatBuildLabel();

  const openUrl = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  const handleShare = () => {
    Share.share({
      message: `${APP_NAME} ${APP_VERSION_LABEL} — the task platform built for Kenya & East Africa. ${WEBSITE_URL}`,
    }).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surfaceMuted }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>About {APP_NAME}</Text>
          <Text style={styles.headerSubtitle}>{APP_VERSION_LABEL}</Text>
        </View>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surfaceMuted }]}
          onPress={handleShare}
          activeOpacity={0.7}
          accessibilityLabel="Share TaskLink"
        >
          <Ionicons name="share-social-outline" size={19} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Image
            source={require('../../assets/images/tasklink_image.png')}
            style={styles.heroLogo}
          />
          <Text style={styles.heroName}>{APP_NAME}</Text>
          <View style={styles.heroVersionRow}>
            <View style={styles.heroPill}>
              <Ionicons name="sparkles" size={12} color="#e9d5ff" />
              <Text style={styles.heroPillText}>{APP_VERSION_LABEL}</Text>
            </View>
            {buildLabel ? (
              <View style={styles.heroPill}>
                <Ionicons name="cube-outline" size={12} color="#e9d5ff" />
                <Text style={styles.heroPillText}>{buildLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroTagline}>
            The task platform that connects everyday people who need help with skilled
            taskers ready to work — built for Kenya &amp; East Africa 🇰🇪
          </Text>
        </LinearGradient>

        {/* ── What is TaskLink ──────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>What is TaskLink</Text>
        <View style={styles.cardGroup}>
          <Text style={styles.paragraph}>
            TaskLink is a mobile marketplace for tasks. Whether you need a cleaner,
            a plumber, a mover or a handyman, or you simply want honest work close to
            home, TaskLink puts the whole process in your pocket.
          </Text>
          <Text style={[styles.paragraph, { marginTop: 12 }]}>
            Post a task in seconds, receive bids from verified people in your area,
            agree on the price, and pay safely through M-Pesa. Everything — chats,
            receipts, ratings and support — stays inside the app.
          </Text>
        </View>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>How It Works</Text>
        <View style={styles.cardGroup}>
          {HOW_IT_WORKS.map((step, index) => (
            <View key={step.title}>
              {index > 0 && <View style={styles.rowDivider} />}
              <View style={styles.stepRow}>
                <View style={[styles.stepIconBox, { backgroundColor: step.tintBg }]}>
                  <Ionicons name={step.icon} size={20} color={step.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>
                    {index + 1}. {step.title}
                  </Text>
                  <Text style={styles.stepBody}>{step.body}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>What You Get</Text>
        <View style={styles.cardGroup}>
          {FEATURES.map((feature, index) => (
            <View key={feature.label}>
              {index > 0 && <View style={styles.rowDivider} />}
              <View style={styles.featureRow}>
                <Ionicons name={feature.icon} size={17} color={colors.primary} />
                <Text style={styles.featureText}>{feature.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Values ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Why We Built It</Text>
        <View style={styles.cardGroup}>
          {VALUES.map((value, index) => (
            <View key={value.title}>
              {index > 0 && <View style={styles.rowDivider} />}
              <View style={styles.stepRow}>
                <View style={[styles.stepIconBox, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={value.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{value.title}</Text>
                  <Text style={styles.stepBody}>{value.body}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Links ─────────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Helpful Links</Text>
        <View style={styles.cardGroup}>
          {LINKS.map((link, index) => (
            <View key={link.label}>
              {index > 0 && <View style={styles.rowDivider} />}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => openUrl(link.url)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: link.tintBg }]}>
                  <Ionicons name={link.icon} size={19} color={link.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>{link.label}</Text>
                  <Text style={styles.menuValue}>{link.url}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── Contact ───────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Contact Us</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="mail-outline" size={19} color="#9333ea" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Email Support</Text>
              <Text style={styles.menuValue}>{SUPPORT_EMAIL}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          {APP_NAME} {APP_VERSION_LABEL} · Made with pride in Kenya 🇰🇪
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e1b4b',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  // Hero
  hero: {
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  heroLogo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    marginBottom: 14,
    backgroundColor: '#ffffff',
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.6,
  },
  heroVersionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroTagline: {
    fontSize: 13.5,
    lineHeight: 21,
    color: '#e0e7ff',
    textAlign: 'center',
    marginTop: 14,
  },
  // Sections
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
  paragraph: {
    fontSize: 13.5,
    lineHeight: 22,
    color: '#4b5563',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  stepIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  stepBody: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#6b7280',
    marginTop: 3,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  featureText: {
    fontSize: 13.5,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
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
  footer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
});