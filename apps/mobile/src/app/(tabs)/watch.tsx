import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Screen } from "../../components/Screen";
import { api, mediaUrl, type Post } from "../../lib/api";
import { colors } from "../../theme";

function VideoPost({ post, height }: { post: Post; height: number }) {
  const player = useVideoPlayer(mediaUrl(post.media_url), (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });
  return (
    <View style={[styles.videoCard, { height }]}>
      <VideoView style={StyleSheet.absoluteFill} player={player} contentFit="cover" nativeControls />
      <View style={styles.overlay}>
        <Text style={styles.creator}>@{post.username}{post.verified ? "  ✓" : ""}</Text>
        {!!post.body && <Text style={styles.caption}>{post.body}</Text>}
        {!!post.location && <Text style={styles.location}>⌖  {post.location}</Text>}
        {post.category && <Text style={styles.category}>{post.category.replaceAll("-", " ")}</Text>}
      </View>
      <View style={styles.actions}><Text style={styles.action}>♥  {post.like_count}</Text><Text style={styles.action}>◌  {post.comment_count}</Text></View>
    </View>
  );
}

export default function WatchScreen() {
  const { height } = useWindowDimensions();
  const [videos, setVideos] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<Post[]>("/api/videos").then(setVideos).catch(() => setVideos([])).finally(() => setLoading(false));
  }, []);
  if (loading) return <Screen><ActivityIndicator style={styles.loader} color={colors.primary} /></Screen>;
  if (!videos.length) return <Screen><View style={styles.empty}><Text style={styles.spark}>✳</Text><Text style={styles.title}>A city in motion.</Text><Text style={styles.sub}>Short videos from people and places around you will show up here.</Text></View></Screen>;
  return <Screen><FlatList data={videos} keyExtractor={(post) => String(post.id)} pagingEnabled showsVerticalScrollIndicator={false} renderItem={({ item }) => <VideoPost post={item} height={Math.max(height - 145, 420)} />} /></Screen>;
}

const styles = StyleSheet.create({
  loader: { flex: 1 },
  videoCard: { position: "relative", marginHorizontal: 10, marginTop: 10, overflow: "hidden", borderRadius: 18, backgroundColor: "#292940" },
  overlay: { position: "absolute", right: 68, bottom: 28, left: 18 },
  creator: { color: "white", fontSize: 13, fontWeight: "800" },
  caption: { marginTop: 8, color: "white", fontSize: 12, lineHeight: 18 },
  location: { marginTop: 8, color: "#e5e2ef", fontSize: 10 },
  category: { alignSelf: "flex-start", marginTop: 9, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden", borderRadius: 7, backgroundColor: "rgba(255,255,255,.2)", color: "white", fontSize: 9, fontWeight: "700", textTransform: "capitalize" },
  actions: { position: "absolute", right: 14, bottom: 32, gap: 18 },
  action: { color: "white", fontSize: 12, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 42 },
  spark: { color: colors.primary, fontSize: 34 },
  title: { marginTop: 12, color: colors.ink, fontSize: 19, fontWeight: "800" },
  sub: { marginTop: 8, color: colors.muted, textAlign: "center", fontSize: 12, lineHeight: 18 }
});
