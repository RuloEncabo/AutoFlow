import { Component, useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { clearTokens, getAccessToken } from "./src/api";
import LoginScreen from "./src/screens/LoginScreen";
import ReceptionScreen from "./src/screens/ReceptionScreen";
import InspectionScreen from "./src/screens/InspectionScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { colors } from "./src/theme";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>No se pudo iniciar AutoFlow</Text>
            <Text style={styles.errorText}>{String(this.state.error?.message || this.state.error)}</Text>
            <TouchableOpacity style={styles.button} onPress={() => this.setState({ error: null })}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function AutoFlowApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState("home");

  useEffect(() => {
    let mounted = true;
    getAccessToken()
      .then((token) => {
        if (mounted) setAuthenticated(Boolean(token));
      })
      .catch(async () => {
        await clearTokens();
        if (mounted) setAuthenticated(false);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AutoFlow</Text>
          <Text style={styles.text}>Iniciando aplicacion...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  const logout = async () => {
    await clearTokens();
    setAuthenticated(false);
    setScreen("home");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>AutoFlow APK</Text>
        <TouchableOpacity onPress={logout}><Text style={styles.link}>Salir</Text></TouchableOpacity>
      </View>
      <View style={styles.nav}>
        <TouchableOpacity style={styles.navButton} onPress={() => setScreen("home")}><Text>Inicio</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => setScreen("reception")}><Text>Recepcion</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => setScreen("inspection")}><Text>Inspeccion</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => setScreen("settings")}><Text>Config</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {screen === "home" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Operacion movil</Text>
            <Text style={styles.text}>Registre recepciones, inspecciones, danos y fotos desde el telefono. Los datos se sincronizan con la web mediante la API Django.</Text>
          </View>
        )}
        {screen === "reception" && <ReceptionScreen />}
        {screen === "inspection" && <InspectionScreen />}
        {screen === "settings" && <SettingsScreen />}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AutoFlowApp />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.blue, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "white", fontSize: 22, fontWeight: "700" },
  link: { color: "white", fontWeight: "700" },
  nav: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 10, backgroundColor: "white" },
  navButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  content: { padding: 14, gap: 12 },
  card: { backgroundColor: "white", borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 8 },
  text: { color: colors.muted, lineHeight: 20 },
  button: { backgroundColor: colors.blue, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 14 },
  buttonText: { color: "white", fontWeight: "800" },
  errorCard: { backgroundColor: "white", borderRadius: 10, borderWidth: 1, borderColor: colors.border, margin: 18, padding: 16 },
  errorTitle: { color: colors.danger, fontSize: 18, fontWeight: "800", marginBottom: 8 },
  errorText: { color: colors.text, lineHeight: 20 },
});
