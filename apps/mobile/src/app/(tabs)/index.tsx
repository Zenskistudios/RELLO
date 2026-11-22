import { useCallback, useEffect, useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { PostCard } from "../../components/PostCard";
import { Screen } from "../../components/Screen";
import { api, type Post } from "../../lib/api";
import { useSession } from "../../session";
import { colors } from "../../theme";

const feeds = [
  { key: "for-you", label: "For you" },
  { key: "following", label: "Following" },
  { key: "nearby", label: "Nearby" },
  { key: "trending", label: "Trending" }
];

export default function FeedScreen() {
  const { user } = useSession();
  const [tab, setTab] = useState("for-you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try { setPosts(await api<Post[]>(`/api/feed?tab=${tab}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn't load the feed."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [tab]);

  useEffect(() => { setLoading(true); void refresh(); }, [refresh]);

  return (
    <Screen>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>A LITTLE CLOSER TO HOME</Text><Text style={styles.greeting}>Hey, {user?.display_name.split(" ")[0]}</Text></View>
        <Link href="/(tabs)/saved" asChild><Pressable style={styles.savedButton}><Text style={styles.savedIcon}>▣</Text></Pressable></Link>
      </View>
      <View style={styles.tabs}>{feeds.map((feed) => <Pressable key={feed.key} onPress={() => setTab(feed.key)} style={[styles.tab, tab === feed.key && styles.activeTab]}><Text style={[styles.tabText, tab === feed.key && styles.activeTabText]}>{feed.label}</Text></Pressable>)}</View>
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void refresh(); }} tintColor={colors.primary} />}
        renderItem={({ item }) => <PostCard post={item} currentUser={user!} onChanged={() => void refresh()} />}
        ListHeaderComponent={<Link href="/compose" asChild><Pressable style={styles.prompt}><View style={styles.promptAvatar}><Text style={styles.promptInitial}>{user?.display_name[0]?.toUpperCase()}</Text></View><Text style={styles.promptText}>What’s happening around you?</Text><Text style={styles.promptPlus}>＋</Text></Pressable></Link>}
        ListEmptyComponent={loading ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : <View style={styles.empty}><Text style={styles.emptyMark}>✳</Text><Text style={styles.emptyTitle}>{error ? "The feed couldn't load." : "A fresh page, close to home."}</Text><Text style={styles.emptyBody}>{error || "Share a neighbourhood update and start the conversation."}</Text></View>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 13 },
  eyebrow: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1.2 },
  greeting: { marginTop: 5, color: colors.ink, fontSize: 23, fontWeight: "800", letterSpacing: -.8 },
  savedButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.paper },
  savedIcon: { color: colors.primary, fontSize: 20 },
  tabs: { flexDirection: "row", paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.paper },
  tab: { flex: 1, paddingVertical: 13, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  activeTabText: { color: colors.primaryDark, fontWeight: "800" },
  list: { paddingTop: 13, paddingBottom: 20 },
  prompt: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 15, marginBottom: 13, padding: 12, borderRadius: 14, backgroundColor: colors.paper },
  promptAvatar: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.primaryPale },
  promptInitial: { color: colors.primaryDark, fontWeight: "800" },
  promptText: { flex: 1, color: "#9aa59e", fontSize: 11 },
  promptPlus: { color: colors.primary, fontSize: 22 },
  spinner: { marginTop: 60 },
  empty: { alignItems: "center", paddingHorizontal: 35, paddingTop: 65 },
  emptyMark: { color: colors.primary, fontSize: 30 },
  emptyTitle: { marginTop: 12, color: colors.ink, fontSize: 16, fontWeight: "800" },
  emptyBody: { marginTop: 8, color: colors.muted, textAlign: "center", fontSize: 12, lineHeight: 18 }
});
