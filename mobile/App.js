import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { clearTokens, getAccessToken } from "./src/api";
import LoginScreen from "./src/screens/LoginScreen";
import ReceptionScreen from "./src/screens/ReceptionScreen";
import InspectionScreen from "./src/screens/InspectionScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { colors } from "./src/theme";

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [screen, setScreen] = useState("home");

  useEffect(() => {
    getAccessToken().then((token) => setAuthenticated(Boolean(token)));
  }, []);

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
});
