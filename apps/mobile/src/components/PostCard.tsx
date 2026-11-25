import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Link } from "expo-router";
import { api, mediaUrl, type Post, type User } from "../lib/api";
import { colors } from "../theme";

function Avatar({ name, url }: { name: string; url?: string }) {
  return url
    ? <Image source={{ uri: url }} style={styles.avatar} />
    : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>;
}

function VideoAttachment({ uri }: { uri: string }) {
  const player = useVideoPlayer(mediaUrl(uri), (instance) => { instance.loop = false; });
  return <VideoView player={player} style={styles.media} nativeControls contentFit="cover" />;
}

export function PostCard({ post, currentUser, onChanged }: { post: Post; currentUser: User; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [saved, setSaved] = useState(Boolean(post.bookmarked));

  async function toggle(action: "like" | "bookmark") {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/api/posts/${post.id}/${action}`, { method: "POST", body: "{}" });
      if (action === "like") {
        setLiked(!liked);
        setLikeCount((count) => count + (liked ? -1 : 1));
      } else setSaved(!saved);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const incident = post.post_type === "incident";
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar name={post.display_name} url={post.avatar_url} />
        <View style={styles.identity}>
          <Text style={styles.name}>{post.display_name}{post.verified ? "  ✓" : ""}</Text>
          <Text style={styles.handle}>@{post.username} · {post.created_at.slice(0, 16)}</Text>
        </View>
        {incident && <View style={styles.reportTag}><Text style={styles.reportText}>{post.category || "Community report"}</Text></View>}
      </View>
      {!!post.body && <Text style={styles.body}>{post.body}</Text>}
      {!!post.location && <Text style={styles.location}>⌖  {post.location}</Text>}
      {!!post.media_url && (post.media_type === "video"
        ? <VideoAttachment uri={post.media_url} />
        : <Image source={{ uri: mediaUrl(post.media_url) }} style={styles.media} resizeMode="cover" />)}
      <View style={styles.actions}>
        <Pressable onPress={() => void toggle("like")} disabled={busy} style={styles.action}><Text style={[styles.actionText, liked && styles.liked]}>{liked ? "♥" : "♡"}  {likeCount}</Text></Pressable>
        <Link href={{ pathname: "/posts/[id]", params: { id: String(post.id) } }} asChild>
          <Pressable style={styles.action}><Text style={styles.actionText}>◌  {post.comment_count}</Text></Pressable>
        </Link>
        <Pressable onPress={() => void api(`/api/posts/${post.id}/repost`, { method: "POST", body: "{}" }).then(onChanged)} style={styles.action}><Text style={styles.actionText}>⟳  {post.repost_count}</Text></Pressable>
        <Pressable onPress={() => void toggle("bookmark")} disabled={busy} style={styles.save}><Text style={[styles.actionText, saved && styles.saved]}>{saved ? "▣" : "▢"}</Text></Pressable>
      </View>
      {post.user_id === currentUser.id && <Text style={styles.ownPost}>Your post</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 15, marginBottom: 11, padding: 15, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: "#edf0eb" },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryPale },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#e8dff8" },
  avatarText: { color: colors.primaryDark, fontSize: 15, fontWeight: "700" },
  identity: { flex: 1 },
  name: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  handle: { marginTop: 3, color: colors.muted, fontSize: 10 },
  reportTag: { maxWidth: 96, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: "#fff1eb" },
  reportText: { color: "#b86b52", fontSize: 9, fontWeight: "700", textTransform: "capitalize" },
  body: { marginTop: 13, color: "#465850", fontSize: 14, lineHeight: 21 },
  location: { marginTop: 8, color: colors.green, fontSize: 11 },
  media: { width: "100%", height: 250, marginTop: 12, overflow: "hidden", borderRadius: 12, backgroundColor: "#e9ece7" },
  actions: { flexDirection: "row", alignItems: "center", gap: 25, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f2ee" },
  action: { paddingVertical: 5 },
  actionText: { color: "#75847c", fontSize: 12 },
  liked: { color: "#dc7067" },
  saved: { color: colors.primary },
  save: { marginLeft: "auto", padding: 5 },
  ownPost: { position: "absolute", right: 12, top: 4, color: colors.muted, fontSize: 8 }
});
