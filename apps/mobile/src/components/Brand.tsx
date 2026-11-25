import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.mark}><Text style={styles.spark}>✳</Text></View>
      <Text style={[styles.name, light && styles.light]}>Rello</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: { width: 35, height: 35, borderRadius: 13, borderBottomLeftRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  spark: { color: "white", fontSize: 22, lineHeight: 26 },
  name: { color: colors.ink, fontSize: 23, fontWeight: "800", letterSpacing: -1.2 },
  light: { color: "white" }
});
