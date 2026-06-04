import { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { listReceptions, uploadReceptionDamage } from "../api";
import { colors } from "../theme";

export default function InspectionScreen() {
  const [receptions, setReceptions] = useState([]);
  const [reception, setReception] = useState("");
  const [zone, setZone] = useState("front");
  const [partName, setPartName] = useState("");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("repair");
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    listReceptions().then((data) => {
      const rows = data.results || [];
      setReceptions(rows);
      setReception(rows[0]?.id || "");
    });
  }, []);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camara", "Debe habilitar permisos de camara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const submit = async () => {
    try {
      if (!reception) throw new Error("No hay recepcion seleccionada.");
      await uploadReceptionDamage({
        reception,
        zone,
        part_name: partName,
        description,
        action_required: action,
        severity: "medium",
        photo,
      });
      Alert.alert("Inspeccion", "Dano registrado y sincronizado.");
      setPartName("");
      setDescription("");
      setPhoto(null);
    } catch (error) {
      Alert.alert("Inspeccion", error.message);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Inspeccion y fotos</Text>
      <Text style={styles.hint}>Recepcion activa: {receptions.find((item) => item.id === reception)?.reception_number || reception}</Text>
      <TextInput style={styles.input} value={reception} onChangeText={setReception} placeholder="ID recepcion" />
      <TextInput style={styles.input} value={zone} onChangeText={setZone} placeholder="Zona: front/rear/left/right/other" />
      <TextInput style={styles.input} value={partName} onChangeText={setPartName} placeholder="Pieza o parte a reparar/cambiar" />
      <TextInput style={styles.input} value={action} onChangeText={setAction} placeholder="Accion: repair/replace/observe" />
      <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Otro dano detectado / descripcion" multiline />
      {photo && <Image source={{ uri: photo.uri }} style={styles.preview} />}
      <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}><Text style={styles.secondaryText}>Tomar foto</Text></TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Sincronizar dano</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  hint: { color: colors.muted, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginVertical: 5 },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  preview: { width: "100%", height: 220, borderRadius: 8, marginVertical: 8 },
  button: { backgroundColor: colors.blue, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 10 },
  buttonText: { color: "white", fontWeight: "800" },
  secondaryButton: { borderWidth: 1, borderColor: colors.blue, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 8 },
  secondaryText: { color: colors.blue, fontWeight: "800" },
});
