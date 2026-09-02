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
            toValue: 0.6,
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
        backgroundColor: 'rgba(167, 139, 250, 0.8)',
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ─── Pulsing glow ring ────────────────────────────────────────────────────────
function PulseRing({ delay, size }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.6,
            duration: 1600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
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
        borderWidth: 2,
        borderColor: 'rgba(167, 139, 250, 0.7)',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// ─── Shimmer dots ─────────────────────────────────────────────────────────────
function ShimmerDots() {
  const dots = [0, 1, 2];
  const anims = dots.map(() => useRef(new Animated.Value(0.3)).current);

  useEffect(() => {
    const animations = dots.map((_, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anims[i], {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(anims[i], {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
      {dots.map((_, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#a78bfa',
            opacity: anims[i],
          }}
        />
      ))}
    </View>
  );
}

// ─── Main gateway screen ──────────────────────────────────────────────────────
export default function GatewayScreen() {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  // Logo animations
  const logoScale  = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Particles
  const particles = [
    { delay: 0,    size: 6,  x: width * 0.15, y: height * 0.55, duration: 3000 },
    { delay: 400,  size: 4,  x: width * 0.75, y: height * 0.45, duration: 2600 },
    { delay: 800,  size: 8,  x: width * 0.35, y: height * 0.65, duration: 3400 },
    { delay: 200,  size: 5,  x: width * 0.85, y: height * 0.60, duration: 2800 },
    { delay: 600,  size: 7,  x: width * 0.10, y: height * 0.40, duration: 3200 },
    { delay: 1000, size: 4,  x: width * 0.60, y: height * 0.70, duration: 2400 },
    { delay: 300,  size: 6,  x: width * 0.50, y: height * 0.30, duration: 3600 },
    { delay: 700,  size: 5,  x: width * 0.25, y: height * 0.75, duration: 2900 },
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

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace('/onboarding');
      return;
    }

    // Slight delay for the animation to play before routing
    const check = async () => {
      try {
        const token = await getToken();
        const user  = await apiFetch('/user/me', token);

        // Give the animation a minimum 1.8s to breathe
        await new Promise((r) => setTimeout(r, 1800));

        if (user.isOnboarded) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/setup/choose-role');
        }
      } catch (err) {
        console.error('[gateway] onboarding check failed:', err.message);
        // If the API call fails (e.g. user not yet in DB), send to setup
        await new Promise((r) => setTimeout(r, 1800));
        router.replace('/setup/choose-role');
      }
    };

    check();
  }, [isLoaded, isSignedIn]);

  return (
    <LinearGradient
      colors={['#1e1b4b', '#312e81', '#4c1d95', '#2d1b69']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      {/* Centre content */}
      <View style={styles.center}>
        {/* Pulsing glow rings */}
        <View style={styles.logoWrapper}>
          <PulseRing delay={0}   size={140} />
          <PulseRing delay={600} size={140} />

          {/* Logo circle */}
          <Animated.View
            style={[
              styles.logoCircle,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}
          >
            <LinearGradient
              colors={['#7c3aed', '#4f46e5']}
              style={styles.logoGradient}
            >
              <Text style={styles.logoLetter}>T</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Wordmark */}
        <Animated.View style={{ opacity: logoOpacity, alignItems: 'center', marginTop: 24 }}>
          <Text style={styles.wordmark}>
            Task<Text style={styles.wordmarkAccent}>Link</Text>
          </Text>
        </Animated.View>

        {/* Loading text */}
        <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.subtitle}>Setting up your experience</Text>
          <ShimmerDots />
        </Animated.View>
      </View>

      {/* Bottom badge */}
      <Animated.View style={[styles.badge, { opacity: textOpacity }]}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>Safe · Trusted · Local</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 20,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  wordmark: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  wordmarkAccent: {
    color: '#a78bfa',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(196, 181, 253, 0.9)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  badge: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#a78bfa',
  },
  badgeText: {
    color: 'rgba(196, 181, 253, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
