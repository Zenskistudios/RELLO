import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { PostCard } from "../../components/PostCard";
import { Screen } from "../../components/Screen";
import { api, type Post, type User } from "../../lib/api";
import { useSession } from "../../session";
import { colors } from "../../theme";

export default function ProfileScreen() {
  const { user, signOut } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    api<{ posts: Post[]; user: User }>(`/api/users/${encodeURIComponent(user.username)}`).then((result) => setPosts(result.posts)).catch(() => setPosts([])).finally(() => setLoading(false));
  }, [user]);
  function confirmSignOut() {
    Alert.alert("Sign out of Rello?", "You can sign in again any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() }
    ]);
  }
  return (
    <Screen>
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <PostCard post={item} currentUser={user!} onChanged={() => { void api<{ posts: Post[] }>(`/api/users/${encodeURIComponent(user!.username)}`).then((result) => setPosts(result.posts)); }} />}
        ListHeaderComponent={<View style={styles.profile}>
          <View style={styles.cover}><Text style={styles.spark}>✳</Text></View>
          <View style={styles.identity}><View style={styles.avatar}><Text style={styles.avatarText}>{user?.display_name[0]?.toUpperCase()}</Text></View><Link href="/(tabs)/saved" asChild><Pressable style={styles.edit}><Text style={styles.editText}>Saved posts</Text></Pressable></Link></View>
          <Text style={styles.name}>{user?.display_name}{user?.verified ? "  ✓" : ""}</Text>
          <Text style={styles.handle}>@{user?.username}</Text>
          {!!user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
          {!!user?.location && <Text style={styles.location}>⌖  {user.location}</Text>}
          <View style={styles.stats}><Text style={styles.stat}>{posts.length} posts</Text><Text style={styles.stat}>{user?.account_type === "organisation" ? "Organisation" : "Rello community"}</Text></View>
          <View style={styles.buttons}><Link href="/compose" asChild><Pressable style={styles.primaryButton}><Text style={styles.primaryText}>＋  New post</Text></Pressable></Link><Pressable style={styles.secondaryButton} onPress={confirmSignOut}><Text style={styles.secondaryText}>Sign out</Text></Pressable></View>
          <Text style={styles.section}>Your posts</Text>
          {loading && <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />}
          {!loading && posts.length === 0 && <Text style={styles.empty}>Your posts will show up here.</Text>}
        </View>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 15 },
  profile: { paddingBottom: 8 },
  cover: { height: 110, justifyContent: "center", alignItems: "flex-end", paddingRight: 30, backgroundColor: "#e9e3f7" },
  spark: { color: colors.primary, fontSize: 49 },
  identity: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 18 },
  avatar: { width: 76, height: 76, marginTop: -34, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.canvas, borderRadius: 40, backgroundColor: "#ddd5f1" },
  avatarText: { color: colors.primaryDark, fontSize: 25, fontWeight: "800" },
  edit: { marginBottom: 9, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: "white" },
  editText: { color: colors.primaryDark, fontSize: 10, fontWeight: "700" },
  name: { marginTop: 10, marginHorizontal: 18, color: colors.ink, fontSize: 20, fontWeight: "800" },
  handle: { marginTop: 3, marginHorizontal: 18, color: colors.muted, fontSize: 11 },
  bio: { marginTop: 12, marginHorizontal: 18, color: "#58695f", fontSize: 12, lineHeight: 18 },
  location: { marginTop: 8, marginHorizontal: 18, color: colors.green, fontSize: 10 },
  stats: { flexDirection: "row", gap: 17, marginTop: 15, marginHorizontal: 18 },
  stat: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  buttons: { flexDirection: "row", gap: 8, marginTop: 16, marginHorizontal: 18 },
  primaryButton: { flex: 1, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: colors.primary },
  primaryText: { color: "white", fontSize: 11, fontWeight: "800" },
  secondaryButton: { paddingHorizontal: 15, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: "white" },
  secondaryText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  section: { marginTop: 20, marginHorizontal: 18, marginBottom: 9, color: colors.ink, fontSize: 14, fontWeight: "800" },
  empty: { margin: 18, color: colors.muted, fontSize: 11 }
});
