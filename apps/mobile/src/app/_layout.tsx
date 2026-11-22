import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../session";
import { colors } from "../theme";

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="compose" options={{ presentation: "modal", headerShown: true, title: "New post", headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.ink }} />
        <Stack.Screen name="posts/[id]" options={{ presentation: "card", headerShown: true, title: "Conversation", headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.ink }} />
      </Stack>
    </SessionProvider>
  );
}
