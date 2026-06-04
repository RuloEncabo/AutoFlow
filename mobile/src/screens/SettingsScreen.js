import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { getApiUrl, getMobileConfig, setApiUrl } from "../api";
import { colors } from "../theme";

export default function SettingsScreen() {
  const [apiUrl, setApiUrlState] = useState("");
  const [config, setConfig] = useState(null);

  useEffect(() => {
    getApiUrl().then(setApiUrlState);
    getMobileConfig().then(setConfig).catch(() => {});
  }, []);

  const save = async () => {
    await setApiUrl(apiUrl);
    Alert.alert("Configuracion", "URL de API guardada.");
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Configuracion APK</Text>
      <Text style={styles.label}>URL API</Text>
      <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrlState} autoCapitalize="none" />
      <TouchableOpacity style={styles.button} onPress={save}><Text style={styles.buttonText}>Guardar</Text></TouchableOpacity>
      {config && (
        <View style={styles.info}>
          <Text>API movil: {config.mobile_api_enabled ? "habilitada" : "deshabilitada"}</Text>
          <Text>Fotos: {config.mobile_photo_upload_enabled ? "habilitadas" : "deshabilitadas"}</Text>
          <Text>Max foto: {config.mobile_max_photo_mb} MB</Text>
          <Text>Offline: {config.mobile_offline_sync_enabled ? "habilitado" : "deshabilitado"}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 16 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  label: { fontWeight: "700", color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginVertical: 8 },
  button: { backgroundColor: colors.blue, borderRadius: 8, padding: 12, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" },
  info: { marginTop: 14, gap: 4 },
});
