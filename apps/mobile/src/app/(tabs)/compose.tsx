import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Screen } from "../../components/Screen";
import { api, type Post } from "../../lib/api";
import { useSession } from "../../session";
import { colors } from "../../theme";

type Mode = "update" | "incident";

export default function ComposeScreen() {
  const { user } = useSession();
  const [mode, setMode] = useState<Mode>("update");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [place, setPlace] = useState("");
  const [coordinates, setCoordinates] = useState<Location.LocationObjectCoords | null>(null);
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickMedia() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsEditing: false, quality: 0.85 });
    if (!result.canceled) setMedia(result.assets[0]);
  }

  async function addLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Location permission", "Allow location access to add a nearby pin to your post.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setCoordinates(position.coords);
      setPlace("Current location");
    } catch {
      Alert.alert("Location unavailable", "You can add a neighbourhood name instead.");
    }
  }

  async function publish() {
    if (!body.trim() && !media) {
      Alert.alert("Add something first", "Write a note or attach a photo or video.");
      return;
    }
    if (mode === "incident" && !category) {
      Alert.alert("Choose a category", "Select what you noticed before sharing the report.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("body", body.trim());
      form.append("mode", mode);
      form.append("visibility", "public");
      form.append("location", place);
      if (mode === "incident") form.append("category", category);
      if (coordinates) {
        form.append("latitude", String(coordinates.latitude));
        form.append("longitude", String(coordinates.longitude));
      }
      if (media) {
        const file = { uri: media.uri, name: media.fileName ?? `rello-${Date.now()}`, type: media.mimeType ?? (media.type === "video" ? "video/mp4" : "image/jpeg") };
        form.append("media", file as unknown as Blob);
      }
      await api<Post>("/api/posts", { method: "POST", body: form });
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Couldn’t publish", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>YOUR VOICE, YOUR NEIGHBOURHOOD</Text>
        <Text style={styles.title}>Start a conversation</Text>
        <View style={styles.modes}>{(["update", "incident"] as const).map((item) => <Pressable key={item} onPress={() => setMode(item)} style={[styles.mode, mode === item && styles.selected]}><Text style={[styles.modeText, mode === item && styles.selectedText]}>{item === "update" ? "✳  Update" : "⌖  Report nearby"}</Text></Pressable>)}</View>
        <View style={styles.editor}><Text style={styles.avatar}>{user?.display_name[0]?.toUpperCase()}</Text><TextInput value={body} onChangeText={setBody} multiline maxLength={2000} placeholder={mode === "incident" ? "What did you notice? Add details that might help a neighbour…" : "What’s happening around you?"} placeholderTextColor="#a0aca4" style={styles.input} textAlignVertical="top" /></View>
        {mode === "incident" && <View style={styles.categories}><Text style={styles.label}>What’s happening?</Text><View style={styles.categoryRow}>{["roads", "flooding", "waste", "power", "safety", "health", "infrastructure"].map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categorySelected]}><Text style={[styles.categoryText, category === item && styles.selectedText]}>{item}</Text></Pressable>)}</View><Text style={styles.notice}>Community reports aren’t official confirmations.</Text></View>}
        {!!media && <Text numberOfLines={1} style={styles.attachment}>Attached: {media.fileName ?? media.uri.split("/").pop()}</Text>}
        <View style={styles.tools}><Pressable onPress={() => void pickMedia()} style={styles.tool}><Text style={styles.toolIcon}>▧</Text><Text style={styles.toolText}>Photo / video</Text></Pressable><Pressable onPress={() => void addLocation()} style={styles.tool}><Text style={styles.toolIcon}>⌖</Text><Text style={styles.toolText}>{place || "Add a place"}</Text></Pressable></View>
        <TextInput value={place} onChangeText={setPlace} placeholder="Neighbourhood or place name" placeholderTextColor="#a0aca4" style={styles.placeInput} />
        <Pressable disabled={loading} onPress={() => void publish()} style={[styles.publish, loading && styles.disabled]}><Text style={styles.publishText}>{loading ? "Sharing…" : mode === "incident" ? "Share report" : "Post to Rello"}  ↗</Text></Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 30 },
  kicker: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1.2 },
  title: { marginTop: 6, marginBottom: 16, color: colors.ink, fontSize: 22, fontWeight: "800" },
  modes: { flexDirection: "row", gap: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  mode: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "transparent", borderRadius: 9 },
  selected: { borderColor: "#e2dff4", backgroundColor: colors.primaryPale },
  modeText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  selectedText: { color: colors.primaryDark },
  editor: { flexDirection: "row", gap: 10, paddingTop: 16 },
  avatar: { width: 36, height: 36, paddingTop: 9, overflow: "hidden", borderRadius: 18, backgroundColor: "#e4dff4", color: colors.primaryDark, textAlign: "center", fontSize: 14, fontWeight: "800" },
  input: { flex: 1, minHeight: 120, padding: 4, color: colors.ink, fontSize: 13, lineHeight: 20 },
  categories: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line },
  label: { marginBottom: 9, color: colors.ink, fontSize: 11, fontWeight: "800" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  category: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 17, backgroundColor: "white" },
  categorySelected: { borderColor: "#d7d2ef", backgroundColor: colors.primaryPale },
  categoryText: { color: "#7d8981", fontSize: 9, textTransform: "capitalize" },
  notice: { marginTop: 9, color: colors.muted, fontSize: 9 },
  attachment: { marginTop: 9, color: colors.green, fontSize: 10 },
  tools: { flexDirection: "row", gap: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line },
  tool: { flexDirection: "row", alignItems: "center", gap: 6 },
  toolIcon: { color: colors.primary, fontSize: 17 },
  toolText: { color: colors.primaryDark, fontSize: 10, fontWeight: "700" },
  placeInput: { height: 43, marginBottom: 15, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: "white", color: colors.ink, fontSize: 11 },
  publish: { height: 45, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.primary },
  publishText: { color: "white", fontSize: 12, fontWeight: "800" },
  disabled: { opacity: .6 }
});
