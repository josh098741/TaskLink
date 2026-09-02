import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { apiFetch } from '../config/api';

const { width, height } = Dimensions.get('window');

// ─── Floating particle component ──────────────────────────────────────────────
function Particle({ delay, size, x, y, duration }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: duration * 0.3,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(translateY, {
            toValue: -30,
            duration: duration * 0.5,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.4,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -60,
            duration: duration * 0.4,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(99, 102, 241, 0.35)',
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ─── Pulsing glow ring ────────────────────────────────────────────────────────
function PulseRing({ delay, size }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.5,
            duration: 2800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2800,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.85, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.28)',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[styles.spinner, { transform: [{ rotate: spin }] }]}
    />
  );
}

// ─── Main gateway screen ──────────────────────────────────────────────────────
export default function GatewayScreen() {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  // Logo animations
  const logoScale  = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Particles — fewer and slower than the original for a calmer feel
  const particles = [
    { delay: 0,    size: 4, x: width * 0.18, y: height * 0.60, duration: 4500 },
    { delay: 1000, size: 3, x: width * 0.78, y: height * 0.50, duration: 5200 },
    { delay: 2000, size: 5, x: width * 0.35, y: height * 0.70, duration: 4000 },
    { delay: 500,  size: 3, x: width * 0.60, y: height * 0.35, duration: 5000 },
  ];

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // ── DESIGN MODE TOGGLE ──────────────────────────────────────────────────
  // Set DESIGN_MODE = true to lock the screen indefinitely while designing.
  // Set DESIGN_MODE = false to resume normal live redirect behavior.
  const DESIGN_MODE = true;

  useEffect(() => {
    if (DESIGN_MODE) return; // Freeze screen in designing state

    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace('/onboarding');
      return;
    }

    const check = async () => {
      try {
        const token = await getToken();
        const user  = await apiFetch('/user/me', token);

        await new Promise((r) => setTimeout(r, 4500));

        if (user.isOnboarded) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/setup/choose-role');
        }
      } catch (err) {
        console.log('[gateway] User onboarding check:', err.message);
        await new Promise((r) => setTimeout(r, 1200));
        router.replace('/setup/choose-role');
      }
    };

    check();
  }, [isLoaded, isSignedIn, DESIGN_MODE]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Soft radial glow washes, sitting under everything */}
      <LinearGradient
        colors={['rgba(99,102,241,0.10)', 'rgba(99,102,241,0)']}
        style={[styles.glow, { top: -height * 0.1, left: -width * 0.2 }]}
      />
      <LinearGradient
        colors={['rgba(56,189,248,0.08)', 'rgba(56,189,248,0)']}
        style={[styles.glow, { bottom: -height * 0.15, right: -width * 0.2 }]}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      {/* Centre content */}
      <View style={styles.center}>
        {/* Pulsing glow rings */}
        <View style={styles.logoWrapper}>
          <PulseRing delay={0}    size={128} />
          <PulseRing delay={1400} size={128} />

          {/* Logo circle */}
          <Animated.View
            style={[
              styles.logoCircle,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}
          >
            <LinearGradient
              colors={['#818cf8', '#6366f1', '#4338ca']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 13l4 4L19 7"
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Wordmark */}
        <Animated.View style={{ opacity: logoOpacity, alignItems: 'center', marginTop: 22 }}>
          <Text style={styles.wordmark}>
            Task<Text style={styles.wordmarkAccent}>Link</Text>
          </Text>
          <Text style={styles.tagline}>GET THINGS DONE, TOGETHER</Text>
        </Animated.View>

        {/* Glassmorphic status card */}
        <Animated.View style={[styles.statusCard, { opacity: textOpacity }]}>
          <Spinner />
          <Text style={styles.subtitle}>Verifying your profile</Text>
        </Animated.View>
      </View>

      {/* Bottom trust badge */}
      <Animated.View style={[styles.badge, { opacity: textOpacity }]}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>
          {DESIGN_MODE ? 'DESIGN MODE — SCREEN LOCKED' : 'SAFE · TRUSTED · LOCAL'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  logoGradient: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '700',
    color: '#14141c',
    letterSpacing: -0.4,
  },
  wordmarkAccent: {
    color: '#6366f1',
    fontWeight: '800',
  },
  tagline: {
    marginTop: 4,
    fontSize: 12.5,
    color: 'rgba(20, 20, 28, 0.4)',
    letterSpacing: 0.4,
    fontWeight: '500',
  },
  statusCard: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.12)',
  },
  spinner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderTopColor: '#6366f1',
  },
  subtitle: {
    fontSize: 13.5,
    color: 'rgba(20, 20, 28, 0.7)',
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
  },
  badgeText: {
    color: 'rgba(20, 20, 28, 0.35)',
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});