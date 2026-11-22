import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { Screen } from "../../components/Screen";
import { api, type Post } from "../../lib/api";
import { colors } from "../../theme";

const initialRegion: Region = { latitude: 6.5244, longitude: 3.3792, latitudeDelta: 0.18, longitudeDelta: 0.18 };

export default function MapScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Post | null>(null);
  useEffect(() => {
    api<Post[]>("/api/map/incidents").then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, []);
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  return (
    <Screen>
      <MapView style={styles.map} initialRegion={initialRegion} onPress={() => setSelected(null)}>
        {posts.filter((post) => post.latitude !== null && post.longitude !== null).map((post) => (
          <Marker
            key={post.id}
            coordinate={{ latitude: post.latitude!, longitude: post.longitude! }}
            title={post.category || post.display_name}
            description={post.body}
            pinColor={post.post_type === "announcement" ? colors.primaryDark : colors.coral}
            onPress={() => setSelected(post)}
          />
        ))}
      </MapView>
      <View style={styles.header}><Text style={styles.kicker}>AROUND YOUR CITY</Text><Text style={styles.title}>The neighbourhood map</Text></View>
      {selected && <View style={styles.callout}><Text style={styles.category}>{selected.category || "Community update"}</Text><Text style={styles.body}>{selected.body}</Text><Text style={styles.place}>{selected.location}</Text></View>}
      {!posts.length && <View style={styles.empty}><Text style={styles.emptyText}>No mapped community updates yet.</Text></View>}
      <View style={styles.disclaimer}><Text style={styles.disclaimerText}>Community posts are not official confirmations.</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  header: { position: "absolute", top: 10, left: 12, right: 12, padding: 14, borderRadius: 13, backgroundColor: "rgba(255,255,255,.95)" },
  kicker: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1.1 },
  title: { marginTop: 4, color: colors.ink, fontSize: 17, fontWeight: "800" },
  callout: { position: "absolute", right: 14, bottom: 55, left: 14, padding: 14, borderRadius: 12, backgroundColor: "white", elevation: 3 },
  category: { color: colors.primaryDark, fontSize: 10, fontWeight: "800", textTransform: "capitalize" },
  body: { marginTop: 7, color: colors.ink, fontSize: 12, lineHeight: 18 },
  place: { marginTop: 6, color: colors.muted, fontSize: 10 },
  empty: { position: "absolute", top: 86, alignSelf: "center", padding: 9, borderRadius: 20, backgroundColor: "white" },
  emptyText: { color: colors.muted, fontSize: 10 },
  disclaimer: { position: "absolute", right: 12, bottom: 9, padding: 7, borderRadius: 7, backgroundColor: "rgba(255,255,255,.9)" },
  disclaimerText: { color: colors.muted, fontSize: 8 }
});
