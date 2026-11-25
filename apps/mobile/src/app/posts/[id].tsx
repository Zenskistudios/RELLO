import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { api, type Comment, type Post } from "../../lib/api";
import { useSession } from "../../session";
import { colors } from "../../theme";

type Conversation = { post: Post; comments: Comment[] };

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function refresh() {
    const result = await api<Conversation>(`/api/posts/${id}`);
    setConversation(result);
  }
  useEffect(() => { refresh().catch(() => undefined).finally(() => setLoading(false)); }, [id]);

  async function reply() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const comment = await api<Comment>(`/api/posts/${id}/comments`, { method: "POST", body: JSON.stringify({ body: body.trim() }) });
      setConversation((current) => current ? { ...current, comments: [...current.comments, comment] } : current);
      setBody("");
    } finally { setSending(false); }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  return <Screen>
    <FlatList
      data={conversation?.comments ?? []}
      keyExtractor={(comment) => String(comment.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={<View style={styles.original}><Text style={styles.author}>{conversation?.post.display_name}  <Text style={styles.handle}>@{conversation?.post.username}</Text></Text><Text style={styles.post}>{conversation?.post.body}</Text></View>}
      renderItem={({ item }) => <View style={styles.comment}><View style={styles.commentAvatar}><Text style={styles.avatarText}>{item.display_name[0]?.toUpperCase()}</Text></View><View style={styles.commentContent}><Text style={styles.author}>{item.display_name}  <Text style={styles.handle}>@{item.username}</Text></Text><Text style={styles.post}>{item.body}</Text></View></View>}
      ListEmptyComponent={<Text style={styles.empty}>Be the first to add to the conversation.</Text>}
    />
    <View style={styles.replyBar}><TextInput value={body} onChangeText={setBody} placeholder={`Reply as @${user?.username}`} placeholderTextColor="#9da8a0" style={styles.input} maxLength={1000} /><Pressable onPress={() => void reply()} disabled={sending || !body.trim()} style={styles.send}><Text style={styles.sendText}>↗</Text></Pressable></View>
  </Screen>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  list: { padding: 15 },
  original: { marginBottom: 10, padding: 15, borderRadius: 13, backgroundColor: "white" },
  author: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  handle: { color: colors.muted, fontSize: 10, fontWeight: "400" },
  post: { marginTop: 8, color: "#506159", fontSize: 12, lineHeight: 18 },
  comment: { flexDirection: "row", gap: 9, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.line },
  commentAvatar: { width: 31, height: 31, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.primaryPale },
  avatarText: { color: colors.primaryDark, fontSize: 11, fontWeight: "800" },
  commentContent: { flex: 1 },
  empty: { marginTop: 35, color: colors.muted, textAlign: "center", fontSize: 11 },
  replyBar: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: "white" },
  input: { flex: 1, height: 39, paddingHorizontal: 11, borderRadius: 20, backgroundColor: colors.canvas, color: colors.ink, fontSize: 11 },
  send: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.primary },
  sendText: { color: "white", fontSize: 18, fontWeight: "800" }
});
