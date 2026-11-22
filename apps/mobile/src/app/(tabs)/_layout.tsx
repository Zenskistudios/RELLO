import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Loading } from "../../components/Loading";
import { useSession } from "../../session";
import { colors } from "../../theme";

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home-outline",
  watch: "play-circle-outline",
  map: "map-outline",
  saved: "bookmark-outline",
  profile: "person-circle-outline"
};

export default function TabLayout() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={({ route }) => ({
      headerStyle: { backgroundColor: colors.canvas },
      headerTitleStyle: { color: colors.ink, fontWeight: "800" },
      headerShadowVisible: false,
      tabBarStyle: { height: 64, paddingTop: 7, paddingBottom: 7, borderTopColor: colors.line, backgroundColor: colors.paper },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontSize: 9, fontWeight: "600" },
      tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? "ellipse-outline"} size={size} color={color} />
    })}>
      <Tabs.Screen name="index" options={{ title: "Rello", tabBarLabel: "Home" }} />
      <Tabs.Screen name="watch" options={{ title: "Watch", tabBarLabel: "Watch" }} />
      <Tabs.Screen name="compose" options={{ title: "New post", tabBarLabel: "Post", tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={29} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: "Around you", tabBarLabel: "Explore" }} />
      <Tabs.Screen name="profile" options={{ title: "Your profile", tabBarLabel: "Profile" }} />
      <Tabs.Screen name="saved" options={{ href: null, title: "Saved posts" }} />
    </Tabs>
  );
}
