import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../config/useOnboardingStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2; // two cards with gap

export default function ChooseRoleScreen() {
  const { update } = useOnboarding();
  const [selected, setSelected] = useState(null); // 'poster' | 'tasker'

  const handleContinue = () => {
    if (!selected) return;
    update({ role: selected });
    router.push('/setup/phone');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {[1,2,3,4,5].map((s) => (
            <View
              key={s}
              style={[styles.stepDot, s === 1 && styles.stepDotActive]}
            />
          ))}
        </View>
        <Text style={styles.stepLabel}>1 of 5</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ──────────────────────────────────────────────────────── */}
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Join TaskLink and get started</Text>
        <Text style={styles.prompt}>I want to join as a:</Text>

        {/* ── Role Cards ─────────────────────────────────────────────────── */}
        <View style={styles.cardRow}>

          {/* Task Poster */}
          <TouchableOpacity
            style={[
              styles.card,
              selected === 'poster' && styles.cardSelected,
            ]}
            activeOpacity={0.85}
            onPress={() => setSelected('poster')}
          >
            {selected === 'poster' && (
              <LinearGradient
                colors={['rgba(79,70,229,0.07)', 'rgba(79,70,229,0.02)']}
                style={StyleSheet.absoluteFill}
                borderRadius={20}
              />
            )}
            <Image
              source={require('../../../assets/images/woman.png')}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Task Poster</Text>
              <Text style={styles.cardDesc}>
                I need help with tasks and want to get things done.
              </Text>
            </View>
            <View style={[
              styles.arrowCircle,
              selected === 'poster' && styles.arrowCircleActive,
            ]}>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={selected === 'poster' ? '#ffffff' : '#9ca3af'}
              />
            </View>
            {selected === 'poster' && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={14} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Tasker */}
          <TouchableOpacity
            style={[
              styles.card,
              selected === 'tasker' && styles.cardSelected,
            ]}
            activeOpacity={0.85}
            onPress={() => setSelected('tasker')}
          >
            {selected === 'tasker' && (
              <LinearGradient
                colors={['rgba(79,70,229,0.07)', 'rgba(79,70,229,0.02)']}
                style={StyleSheet.absoluteFill}
                borderRadius={20}
              />
            )}
            <Image
              source={require('../../../assets/images/man.png')}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Tasker</Text>
              <Text style={styles.cardDesc}>
                I want to offer my skills and help people get things done.
              </Text>
            </View>
            <View style={[
              styles.arrowCircle,
              selected === 'tasker' && styles.arrowCircleActive,
            ]}>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={selected === 'tasker' ? '#ffffff' : '#9ca3af'}
              />
            </View>
            {selected === 'tasker' && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={14} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Continue button ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          activeOpacity={selected ? 0.85 : 1}
          onPress={handleContinue}
          disabled={!selected}
        >
          {selected ? (
            <LinearGradient
              colors={['#4f46e5', '#7c3aed']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtnGradient}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          ) : (
            <View style={styles.continueBtnGradient}>
              <Text style={[styles.continueBtnText, { color: '#9ca3af' }]}>
                Select a role to continue
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInLink}
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          <Text style={styles.signInText}>
            Already have an account?{' '}
            <Text style={styles.signInAccent}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
  },
  stepDotActive: {
    backgroundColor: '#4f46e5',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e1b4b',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 28,
  },
  prompt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    borderColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  cardImage: {
    width: '100%',
    height: 170,
    backgroundColor: '#f5f3ff',
  },
  cardBody: {
    padding: 12,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e1b4b',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  arrowCircleActive: {
    backgroundColor: '#4f46e5',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  continueBtnDisabled: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  signInText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  signInAccent: {
    color: '#4f46e5',
    fontWeight: '700',
  },
});
