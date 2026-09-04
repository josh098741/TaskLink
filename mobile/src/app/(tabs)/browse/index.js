import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchPosts,
  getPopularSearches,
  getSearchSuggestions,
  recordSearch,
} from '../../../config/api';
import { CATEGORIES } from '../../../config/categoriesData';

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const PAYMENT_LABELS = { fixed: 'Fixed', hourly: 'Hourly', negotiable: 'Negotiable' };

function catLabel(id) {
  return (id && CAT_MAP[id]) || id || 'General';
}

export default function Browse() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [popular, setPopular] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Search results state
  const [posts, setPosts] = useState(null); // null = not searched yet
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultError, setResultError] = useState(null);
  const [searchedTerm, setSearchedTerm] = useState('');

  const suggestTimer = useRef(null);
  const suggestSeq = useRef(0);

  // Load popular searches when the screen gains focus (only when idle).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (posts === null) {
        getPopularSearches(3)
          .then((terms) => {
            if (!cancelled) setPopular(terms || []);
          })
          .catch((err) => console.warn('[browse] popular failed:', err));
      }
      return () => {
        cancelled = true;
      };
    }, [posts])
  );

  // Fetch autocomplete suggestions with a short debounce as the user types.
  useEffect(() => {
    const q = query.trim();
    if (suggestTimer.current) clearTimeout(suggestTimer.current);

    if (!q || focused === false) {
      setSuggestions([]);
      return;
    }

    suggestTimer.current = setTimeout(async () => {
      const runId = ++suggestSeq.current;
      setSuggestLoading(true);
      try {
        const terms = await getSearchSuggestions(q);
        if (suggestSeq.current === runId) setSuggestions(terms || []);
      } catch (err) {
        console.warn('[browse] suggest failed:', err);
        if (suggestSeq.current === runId) setSuggestions([]);
      } finally {
        if (suggestSeq.current === runId) setSuggestLoading(false);
      }
    }, 250);

    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [query, focused]);

  const runSearch = useCallback(async (term) => {
    const q = term.trim();
    if (!q) return;
    Keyboard.dismiss();
    setQuery(q);
    setSuggestions([]);
    setSearchedTerm(q);
    setLoadingResults(true);
    setResultError(null);

    // Record the completed search (full words) — fire and forget.
    recordSearch(q).catch((err) =>
      console.warn('[browse] record search failed:', err)
    );

    try {
      const list = await fetchPosts({ q });
      setPosts(list);
    } catch (err) {
      console.warn('[browse] search failed:', err);
      setResultError(err.message || 'Failed to load results.');
    } finally {
      setLoadingResults(false);
    }
  }, []);

  const onSubmitEditing = () => {
    runSearch(query);
  };

  const onSelectSuggestion = (term) => {
    setQuery(term);
    runSearch(term);
  };

  const onSelectPopular = (term) => {
    setQuery(term);
    runSearch(term);
  };

  const startNewSearch = () => {
    setPosts(null);
    setQuery('');
    setSuggestions([]);
    setSearchedTerm('');
  };

  const renderPostCard = ({ item }) => {
    const photo = Array.isArray(item.photos) && item.photos.length > 0 ? item.photos[0] : null;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/post/${item.id}`)}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="briefcase-outline" size={30} color="#c7d2fe" />
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardCategory} numberOfLines={1}>
              {catLabel(item.category)}
            </Text>
            {item.isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>Urgent</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            <Ionicons name="location-outline" size={13} color="#9ca3af" /> {item.location}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardBudget}>
              KSh {item.budgetAmount}
              <Text style={styles.cardBudgetType}>
                {' '}({PAYMENT_LABELS[item.paymentType] || 'Fixed'})
              </Text>
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#4f46e5" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const showSuggestions = focused && query.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse</Text>
        <Text style={styles.headerSub}>Search tasks and gigs near you</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        {posts !== null && (
          <TouchableOpacity
            style={styles.searchBack}
            onPress={startNewSearch}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#4f46e5" />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a task or service..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          onSubmitEditing={onSubmitEditing}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setSuggestions([]);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color="#c4b5fd" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Idle: popular search pills ─────────────────────────────────── */}
      {posts === null && !showSuggestions && (
        <ScrollView
          contentContainerStyle={styles.idleContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.idleLabel}>Most searched</Text>
          {popular.length > 0 ? (
            <View style={styles.pillsWrap}>
              {popular.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.pill}
                  activeOpacity={0.7}
                  onPress={() => onSelectPopular(term)}
                >
                  <Ionicons name="search" size={15} color="#4f46e5" />
                  <Text style={styles.pillText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.idleEmpty}>
              No popular searches yet — be the first to search!
            </Text>
          )}
        </ScrollView>
      )}

      {/* ── Typing: autocomplete suggestions ───────────────────────────── */}
      {showSuggestions && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.suggestList}
          showsVerticalScrollIndicator={false}
        >
          {suggestLoading ? (
            <ActivityIndicator size="small" color="#4f46e5" style={styles.suggestSpinner} />
          ) : suggestions.length > 0 ? (
            suggestions.map((term, idx) => (
              <TouchableOpacity
                key={`${term}-${idx}`}
                style={styles.suggestRow}
                activeOpacity={0.7}
                onPress={() => onSelectSuggestion(term)}
              >
                <Ionicons name="arrow-up-outline" size={16} color="#c4b5fd" />
                <Text style={styles.suggestText}>{term}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity
              style={styles.suggestRow}
              activeOpacity={0.7}
              onPress={() => onSelectSuggestion(query.trim())}
            >
              <Ionicons name="search" size={16} color="#c4b5fd" />
              <Text style={styles.suggestText}>Search &ldquo;{query.trim()}&rdquo;</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ── Results: list of matching posts ────────────────────────────── */}
      {posts !== null && !showSuggestions && (
        <View style={styles.resultsWrap}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle} numberOfLines={1}>
              Results for &ldquo;{searchedTerm}&rdquo;
            </Text>
            <Text style={styles.resultsCount}>
              {posts.length} task{posts.length === 1 ? '' : 's'}
            </Text>
          </View>

          {loadingResults ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#4f46e5" />
            </View>
          ) : resultError ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
              <Text style={styles.errorText}>{resultError}</Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="search-outline" size={44} color="#c7d2fe" />
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptySubtitle}>
                Try a different search or check back later.
              </Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={renderPostCard}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  header: {
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
  headerSub: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginTop: 2 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchBack: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1e1b4b' },

  idleContent: { padding: 20 },
  idleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 14,
  },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  pillText: { fontSize: 14, fontWeight: '700', color: '#4f46e5', textTransform: 'capitalize' },
  idleEmpty: { fontSize: 14, color: '#9ca3af' },

  suggestList: { padding: 8 },
  suggestSpinner: { marginTop: 20 },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  suggestText: { fontSize: 16, fontWeight: '600', color: '#1e1b4b', flex: 1 },

  resultsWrap: { flex: 1 },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  resultsTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1e1b4b' },
  resultsCount: { fontSize: 12.5, fontWeight: '600', color: '#9ca3af' },
  list: { paddingHorizontal: 20, paddingBottom: 120 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: '#6b7280', marginTop: 12, textAlign: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e1b4b', marginTop: 14 },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
    maxWidth: 260,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: { width: '100%', height: 140 },
  cardImagePlaceholder: {
    backgroundColor: '#f3f1ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 16 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
    marginRight: 8,
  },
  urgentBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentText: { fontSize: 11, fontWeight: '700', color: '#ef4444' },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e1b4b',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  cardMeta: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginBottom: 12 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  cardBudget: { fontSize: 16, fontWeight: '800', color: '#2563eb' },
  cardBudgetType: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
});
