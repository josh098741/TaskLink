import { useEffect, useState } from 'react';
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
import { useAuth, useUser } from '@clerk/expo';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { apiFetch } from '../config/api';

const { width, height } = Dimensions.get('window');

// ─── Timeout guards ───────────────────────────────────────────────────────────
// Native `fetch` (via apiFetch) and Clerk's `getToken` can hang indefinitely on
// a slow or unreachable network. Every await below is bounded so the gateway can
// never sit on its spinner forever.
const TOKEN_TIMEOUT_MS = 8000;
const USER_ME_TIMEOUT_MS = 15000;
const MAX_VERIFY_MS = 20000;

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ─── Floating particle component ──────────────────────────────────────────────
function Particle({ delay, size, x, y, duration }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(0));

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
  }, [delay, duration, opacity, translateY]);

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
  const [scale] = useState(() => new Animated.Value(0.85));
  const [opacity] = useState(() => new Animated.Value(0.6));

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
  }, [delay, opacity, scale]);

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
  const [rotate] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotate]);

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
  const { user } = useUser();
  const userId = user?.id ?? '';

  // Logo animations
  const [logoScale] = useState(() => new Animated.Value(0.7));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [textOpacity] = useState(() => new Animated.Value(0));

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
  }, [logoOpacity, logoScale, textOpacity]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace('/onboarding');
      return;
    }

    let isMounted = true;
    let resolved = false;
    let deadline;

    // Navigate at most once, so a late-finishing check can never fight the
    // deadline or an earlier decision.
    const finish = (route) => {
      if (!isMounted || resolved) return;
      resolved = true;
      clearTimeout(deadline);
      router.replace(route);
    };

    // Absolute safety net: if every attempt hangs or fails, fall back to the
    // setup flow instead of leaving the spinner up forever. The setup layout
    // re-checks onboarding itself, so onboarded users get redirected to home.
    deadline = setTimeout(() => finish('/setup/choose-role'), MAX_VERIFY_MS);

    // Prefer the cached token (no extra round-trip to Clerk), and only force a
    // refresh when the cache is empty. Both calls are time-bounded.
    const getTokenSafe = async () => {
      const cached = await withTimeout(getToken(), TOKEN_TIMEOUT_MS, null);
      if (cached) return cached;
      return withTimeout(getToken({ skipCache: true }), TOKEN_TIMEOUT_MS, null);
    };

    const fetchUserMe = async () => {
      const token = await getTokenSafe();
      return apiFetch('/user/me', token, {
        headers: { 'x-clerk-user-id': userId || '' },
        timeoutMs: USER_ME_TIMEOUT_MS,
      });
    };

    const routeFor = (userMe) =>
      userMe && userMe.isOnboarded ? '/(tabs)/home' : '/setup/choose-role';

    const check = async () => {
      try {
        const userMe = await fetchUserMe();
        // Short 300ms transition for a crisp, smooth user experience
        await new Promise((r) => setTimeout(r, 300));
        if (isMounted) finish(routeFor(userMe));
      } catch (err) {
        console.log('[gateway] User onboarding check error:', err.message);
        if (!isMounted) return;

        // Retry once before making the final routing decision.
        try {
          const userMe = await fetchUserMe();
          if (isMounted) finish(routeFor(userMe));
        } catch (retryErr) {
          console.log('[gateway] Retry check error:', retryErr.message);
          finish('/setup/choose-role');
        }
      }
    };

    check();

    return () => {
      isMounted = false;
      resolved = true;
      clearTimeout(deadline);
    };
  }, [getToken, isLoaded, isSignedIn, userId]);

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
});