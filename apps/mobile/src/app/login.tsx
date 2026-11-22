import { useState } from "react";
import { Link, Redirect } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Brand } from "../components/Brand";
import { Loading } from "../components/Loading";
import { Screen } from "../components/Screen";
import { useSession } from "../session";
import { colors } from "../theme";

export default function LoginScreen() {
  const { user, loading, authenticate } = useSession();
  const [register, setRegister] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (loading) return <Loading />;
  if (user) return <Redirect href="/(tabs)" />;

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      await authenticate({ email, password, ...(register ? { displayName, username } : {}) }, register);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't sign you in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}><Brand light /><Text style={styles.heroTitle}>Your city,{`\n`}in the conversation.</Text><Text style={styles.heroBody}>People, places and the little things happening around you.</Text><View style={styles.orbit} /></View>
          <View style={styles.form}>
            <Text style={styles.kicker}>{register ? "COME ON IN" : "GOOD TO SEE YOU"}</Text>
            <Text style={styles.title}>{register ? "Make yourself at home." : "Welcome back."}</Text>
            {register && <Field label="Your name" value={displayName} onChangeText={setDisplayName} placeholder="How should we call you?" />}
            {register && <Field label="Username" value={username} onChangeText={setUsername} placeholder="yourname" autoCapitalize="none" />}
            <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Pressable style={[styles.submit, submitting && styles.disabled]} onPress={() => void submit()} disabled={submitting}>
              <Text style={styles.submitText}>{submitting ? "One moment…" : register ? "Create your account" : "Sign in"}  ↗</Text>
            </Pressable>
            <Text style={styles.switch}>{register ? "Already around here?" : "New to Rello?"} <Text style={styles.switchLink} onPress={() => { setError(""); setRegister(!register); }}>{register ? "Sign in" : "Create an account"}</Text></Text>
            <Text style={styles.terms}>A social space built around the places we call home.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean; keyboardType?: "email-address"; autoCapitalize?: "none" }) {
  return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#a5afa9" /></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 25 },
  hero: { minHeight: 270, overflow: "hidden", paddingHorizontal: 25, paddingTop: 31, paddingBottom: 34, justifyContent: "space-between", backgroundColor: "#302f51" },
  heroTitle: { marginTop: 38, color: "white", fontSize: 34, fontWeight: "700", letterSpacing: -1.4, lineHeight: 39 },
  heroBody: { maxWidth: 300, marginTop: 10, color: "#d8d5e8", fontSize: 13, lineHeight: 19 },
  orbit: { position: "absolute", width: 220, height: 220, right: -120, top: 80, borderWidth: 1, borderColor: "rgba(255,255,255,.15)", borderRadius: 120 },
  form: { paddingHorizontal: 25, paddingTop: 27 },
  kicker: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  title: { marginTop: 8, marginBottom: 18, color: colors.ink, fontSize: 23, fontWeight: "700", letterSpacing: -.7 },
  field: { marginBottom: 14 },
  label: { marginBottom: 6, color: "#596960", fontSize: 11, fontWeight: "700" },
  input: { height: 47, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.paper, color: colors.ink, fontSize: 13 },
  error: { marginBottom: 10, color: "#b64c3c", fontSize: 12 },
  submit: { height: 48, marginTop: 3, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.primary },
  submitText: { color: "white", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: .65 },
  switch: { marginTop: 20, color: colors.muted, textAlign: "center", fontSize: 11 },
  switchLink: { color: colors.primaryDark, fontWeight: "700" },
  terms: { marginTop: 22, color: "#a2aca5", textAlign: "center", fontSize: 10 }
});
