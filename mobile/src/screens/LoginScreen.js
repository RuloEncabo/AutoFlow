import { useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { login } from "../api";
import { colors } from "../theme";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await login(email, password);
      onLogin();
    } catch (error) {
      Alert.alert("Login", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <View style={styles.banner}>
          <Text style={styles.title}>AutoFlow</Text>
          <Text style={styles.subtitle}>Ingreso movil seguro</Text>
        </View>
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Contrasena" secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Ingresando..." : "Ingresar"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 18 },
  card: { backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  banner: { backgroundColor: colors.blue, padding: 22, alignItems: "center" },
  title: { color: "white", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.85)", marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, margin: 14, marginBottom: 0, padding: 12 },
  button: { backgroundColor: colors.blue, borderRadius: 8, margin: 14, padding: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "800" },
});
