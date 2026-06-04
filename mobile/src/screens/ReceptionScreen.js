import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { createReception, listClients, listVehicles } from "../api";
import { inspectionChecklist, receptionChecklist } from "../checklists";
import { colors } from "../theme";

function buildChecklist(problemCodes) {
  return receptionChecklist.map(([code, label]) => ({
    code,
    label,
    section: "Recepcion",
    status: problemCodes.includes(code) ? "problem" : "ok",
  }));
}

function buildInspection(results) {
  return inspectionChecklist.map(([code, section, label]) => ({
    code,
    label,
    section,
    result: results[code] || "not_checked",
  }));
}

export default function ReceptionScreen() {
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [client, setClient] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("50");
  const [problemCodes, setProblemCodes] = useState([]);
  const [inspectionResults, setInspectionResults] = useState({});

  useEffect(() => {
    listClients().then((data) => setClients(data.results || []));
    listVehicles().then((data) => setVehicles(data.results || []));
  }, []);

  const toggleProblem = (code) => {
    setProblemCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  };

  const toggleImmediate = (code) => {
    setInspectionResults((current) => ({
      ...current,
      [code]: current[code] === "immediate_attention" ? "ok" : "immediate_attention",
    }));
  };

  const submit = async () => {
    try {
      const selectedClient = client || clients[0]?.id;
      const selectedVehicle = vehicle || vehicles.find((item) => item.client === selectedClient)?.id || vehicles[0]?.id;
      if (!selectedClient || !selectedVehicle) throw new Error("Debe existir cliente y vehiculo.");
      const payload = {
        client: selectedClient,
        vehicle: selectedVehicle,
        driver_name: driver,
        odometer_km: odometer || null,
        fuel_level: Number(fuel || 0),
        checklist_items: buildChecklist(problemCodes),
        inspection_items: buildInspection(inspectionResults),
        mobile_device_id: "apk",
      };
      const response = await createReception(payload);
      Alert.alert("Recepcion", `Registrada ${response.reception_number}`);
      setProblemCodes([]);
      setInspectionResults({});
      setDriver("");
      setOdometer("");
    } catch (error) {
      Alert.alert("Recepcion", error.message);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Check de recepcion</Text>
      <Text style={styles.label}>Cliente ID</Text>
      <TextInput style={styles.input} value={client} onChangeText={setClient} placeholder={clients[0]?.id || "cliente"} />
      <Text style={styles.label}>Vehiculo ID</Text>
      <TextInput style={styles.input} value={vehicle} onChangeText={setVehicle} placeholder={vehicles[0]?.id || "vehiculo"} />
      <TextInput style={styles.input} value={driver} onChangeText={setDriver} placeholder="Conductor" />
      <TextInput style={styles.input} value={odometer} onChangeText={setOdometer} placeholder="Kilometraje" keyboardType="numeric" />
      <TextInput style={styles.input} value={fuel} onChangeText={setFuel} placeholder="Combustible %" keyboardType="numeric" />
      <Text style={styles.section}>Marcar problemas detectados</Text>
      {receptionChecklist.map(([code, label]) => (
        <TouchableOpacity key={code} style={styles.row} onPress={() => toggleProblem(code)}>
          <Text style={problemCodes.includes(code) ? styles.problem : styles.text}>{problemCodes.includes(code) ? "[X]" : "[ ]"} {label}</Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.section}>Inspeccion: atencion inmediata</Text>
      {inspectionChecklist.map(([code, section, label]) => (
        <TouchableOpacity key={code} style={styles.row} onPress={() => toggleImmediate(code)}>
          <Text style={inspectionResults[code] === "immediate_attention" ? styles.problem : styles.text}>{inspectionResults[code] === "immediate_attention" ? "[!]" : "[ ]"} {section} - {label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Enviar recepcion</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 16 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  label: { fontWeight: "700", marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginVertical: 5 },
  section: { marginTop: 14, marginBottom: 6, color: colors.blue, fontWeight: "800" },
  row: { paddingVertical: 5 },
  text: { color: colors.text },
  problem: { color: colors.danger, fontWeight: "700" },
  button: { backgroundColor: colors.blue, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 14 },
  buttonText: { color: "white", fontWeight: "800" },
});
