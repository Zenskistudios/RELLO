import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text } from "react-native";
import { PostCard } from "../../components/PostCard";
import { Screen } from "../../components/Screen";
import { api, type Post } from "../../lib/api";
import { useSession } from "../../session";
import { colors } from "../../theme";

export default function SavedScreen() {
  const { user } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { setPosts(await api<Post[]>("/api/bookmarks")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return (
    <Screen>
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <PostCard post={item} currentUser={user!} onChanged={() => void refresh()} />}
        ListHeaderComponent={<Text style={styles.subtitle}>Posts you wanted to keep close.</Text>}
        ListEmptyComponent={loading ? <ActivityIndicator style={styles.loading} color={colors.primary} /> : <Text style={styles.empty}>Bookmark a post to find it again here.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 10, paddingBottom: 20 },
  subtitle: { marginHorizontal: 17, marginBottom: 14, color: colors.muted, fontSize: 11 },
  loading: { marginTop: 55 },
  empty: { marginTop: 55, marginHorizontal: 30, color: colors.muted, textAlign: "center", fontSize: 12, lineHeight: 18 }
});
