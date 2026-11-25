import { type ReactNode } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { colors } from "../theme";

export function Screen({ children }: { children: ReactNode }) {
  return <SafeAreaView style={styles.safe}><View style={styles.content}>{children}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" }
});
