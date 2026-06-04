import AddIcon from "@mui/icons-material/Add";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { listClients } from "../../api/clientsApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import {
  completeReception,
  createReception,
  createReceptionDamage,
  downloadReceptionPdf,
  listReceptionDamages,
  listReceptions,
} from "../../api/receptionsApi.js";
import { listVehicles } from "../../api/vehiclesApi.js";
import { listWorkOrders } from "../../api/workOrdersApi.js";
import StatusChip from "../../components/StatusChip.jsx";

const commercialBlue = "#0B84F3";

const checklistDefinitions = [
  ["lights", "Luces", "Recepcion"],
  ["turn_signals", "Giros / balizas", "Recepcion"],
  ["brake_lights", "Luces de freno", "Recepcion"],
  ["mirrors", "Espejos", "Recepcion"],
  ["windows", "Cristales", "Recepcion"],
  ["wipers", "Limpiaparabrisas", "Recepcion"],
  ["fluid_levels", "Niveles de fluidos", "Recepcion"],
  ["battery", "Bateria", "Recepcion"],
  ["documents", "Documentacion", "Recepcion"],
  ["keys", "Llaves", "Recepcion"],
  ["interior", "Interior / tapizado", "Recepcion"],
  ["cleaning", "Limpieza interior/exterior", "Recepcion"],
];

const inspectionDefinitions = [
  ["washer_fluid", "Liquido lavaparabrisas", "Fluidos"],
  ["brake_fluid", "Liquido de freno", "Fluidos"],
  ["coolant", "Refrigerante", "Fluidos"],
  ["oil_leaks", "Perdidas de aceite/fluidos", "Motor"],
  ["horn_lights", "Bocina y luces exteriores", "Electricidad"],
  ["brakes", "Frenos", "Seguridad"],
  ["tires", "Neumaticos", "Seguridad"],
  ["suspension", "Suspension", "Mecanica"],
  ["exhaust", "Escape", "Mecanica"],
  ["body_damage", "Danos de carroceria", "Carroceria"],
];

const emptyReception = {
  client: "",
  vehicle: "",
  work_order: "",
  driver_name: "",
  driver_phone: "",
  driver_document: "",
  odometer_km: "",
  fuel_level: 50,
  notes: "",
};

const emptyDamage = {
  zone: "front",
  part_name: "",
  damage_type: "",
  severity: "medium",
  action_required: "repair",
  description: "",
  photoFile: null,
};

const statusLabels = {
  draft: "Borrador",
  in_progress: "En recepcion",
  completed: "Completada",
  cancelled: "Cancelada",
};

function buildChecklist(problemCodes) {
  return checklistDefinitions.map(([code, label, section]) => ({
    code,
    label,
    section,
    status: problemCodes.includes(code) ? "problem" : "ok",
    notes: "",
  }));
}

function buildInspection(results) {
  return inspectionDefinitions.map(([code, label, section]) => ({
    code,
    label,
    section,
    result: results[code] || "not_checked",
    notes: "",
  }));
}

export default function ReceptionPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyReception);
  const [problemCodes, setProblemCodes] = useState([]);
  const [inspectionResults, setInspectionResults] = useState({});
  const [selectedReception, setSelectedReception] = useState(null);
  const [damageForm, setDamageForm] = useState(emptyDamage);
  const [toast, setToast] = useState(null);

  const receptionsQuery = useQuery({
    queryKey: ["receptions", search],
    queryFn: () => listReceptions({ page_size: 50, search: search || undefined }),
  });
  const clientsQuery = useQuery({ queryKey: ["clients", "options"], queryFn: () => listClients({ page_size: 100 }) });
  const vehiclesQuery = useQuery({ queryKey: ["vehicles", "options"], queryFn: () => listVehicles({ page_size: 100 }) });
  const ordersQuery = useQuery({ queryKey: ["work-orders", "options"], queryFn: () => listWorkOrders({ page_size: 100 }) });
  const damagesQuery = useQuery({
    queryKey: ["reception-damages", selectedReception?.id],
    queryFn: () => listReceptionDamages({ reception: selectedReception.id, page_size: 100 }),
    enabled: Boolean(selectedReception),
  });

  const rows = receptionsQuery.data?.results || [];
  const clients = clientsQuery.data?.results || [];
  const vehicles = vehiclesQuery.data?.results || [];
  const orders = ordersQuery.data?.results || [];
  const filteredVehicles = form.client ? vehicles.filter((vehicle) => vehicle.client === form.client) : vehicles;
  const filteredOrders = form.vehicle ? orders.filter((order) => order.vehicle === form.vehicle) : orders;
  const damages = damagesQuery.data?.results || [];

  const saveMutation = useMutation({
    mutationFn: () =>
      createReception({
        ...form,
        work_order: form.work_order || null,
        odometer_km: form.odometer_km || null,
        checklist_items: buildChecklist(problemCodes),
        inspection_items: buildInspection(inspectionResults),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptions"] });
      setFormOpen(false);
      setForm(emptyReception);
      setProblemCodes([]);
      setInspectionResults({});
      setToast({ severity: "success", message: "Recepcion registrada." });
    },
    onError: (error) => setToast({ severity: "error", message: getApiErrorMessage(error) }),
  });

  const completeMutation = useMutation({
    mutationFn: (id) => completeReception(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptions"] });
      setToast({ severity: "success", message: "Recepcion completada." });
    },
  });

  const damageMutation = useMutation({
    mutationFn: () => createReceptionDamage({ ...damageForm, reception: selectedReception.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception-damages"] });
      queryClient.invalidateQueries({ queryKey: ["receptions"] });
      setDamageForm(emptyDamage);
    },
    onError: (error) => setToast({ severity: "error", message: getApiErrorMessage(error) }),
  });

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value, ...(field === "client" ? { vehicle: "", work_order: "" } : {}), ...(field === "vehicle" ? { work_order: "" } : {}) }));
  };

  const toggleProblem = (code) => {
    setProblemCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  };

  const setInspectionResult = (code, value) => {
    setInspectionResults((current) => ({ ...current, [code]: value }));
  };

  const openCreate = () => {
    setForm({ ...emptyReception, client: clients[0]?.id || "" });
    setProblemCodes([]);
    setInspectionResults({});
    setFormOpen(true);
  };

  const handlePdf = async (reception) => {
    try {
      await downloadReceptionPdf(reception.id, `${reception.reception_number}.pdf`);
    } catch (error) {
      setToast({ severity: "error", message: getApiErrorMessage(error, "No se pudo descargar el PDF.") });
    }
  };

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          color: "white",
          background: `linear-gradient(135deg, ${commercialBlue} 0%, ${commercialBlue} 62%, #ffffff 62%, #ffffff 100%)`,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h4" color="white">Recepcion de vehiculos</Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.84)" }}>
          Check de recepcion, inspeccion multipunto, danos y fotos desde web o APK.
        </Typography>
      </Box>

      {toast && <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert>}

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap" mb={2}>
            <TextField
              placeholder="Buscar por cliente, patente, recepcion o conductor"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: 320, flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nueva recepcion</Button>
          </Box>
          {receptionsQuery.isError && <Alert severity="error">{getApiErrorMessage(receptionsQuery.error)}</Alert>}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Recepcion</TableCell>
                  <TableCell>Cliente / vehiculo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Alertas</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{item.reception_number}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.received_at?.slice(0, 10)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>{item.client_name}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.vehicle_label}</Typography>
                    </TableCell>
                    <TableCell><StatusChip label={statusLabels[item.status] || item.status} color={item.status === "completed" ? "success" : "primary"} /></TableCell>
                    <TableCell>{item.source_label}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{item.checklist_problem_count} problemas check</Typography>
                      <Typography variant="body2">{item.immediate_attention_count} urgentes</Typography>
                      <LinearProgress variant="determinate" value={Math.min((item.damage_count || 0) * 25, 100)} sx={{ mt: 0.5, height: 6, borderRadius: 4 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver danos y fotos"><IconButton onClick={() => setSelectedReception(item)}><VisibilityIcon /></IconButton></Tooltip>
                      <Tooltip title="Descargar check PDF"><IconButton color="primary" onClick={() => handlePdf(item)}><PictureAsPdfIcon /></IconButton></Tooltip>
                      <Tooltip title="Completar recepcion"><span><IconButton color="success" disabled={item.status === "completed"} onClick={() => completeMutation.mutate(item.id)}><CheckCircleIcon /></IconButton></span></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!receptionsQuery.isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={6}><Typography color="text.secondary" textAlign="center" py={4}>Sin recepciones registradas.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="lg" fullWidth>
        <Box component="form" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
          <DialogTitle>Nueva recepcion</DialogTitle>
          <DialogContent>
            <Stack spacing={3} pt={1}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}><TextField select label="Cliente" value={form.client} onChange={updateForm("client")} required fullWidth>{clients.map((client) => <MenuItem key={client.id} value={client.id}>{client.full_name}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} md={4}><TextField select label="Vehiculo" value={form.vehicle} onChange={updateForm("vehicle")} required fullWidth>{filteredVehicles.map((vehicle) => <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.plate} - {vehicle.brand} {vehicle.model}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} md={4}><TextField select label="Orden asociada" value={form.work_order} onChange={updateForm("work_order")} fullWidth><MenuItem value="">Sin orden</MenuItem>{filteredOrders.map((order) => <MenuItem key={order.id} value={order.id}>{order.order_number}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} md={4}><TextField label="Conductor" value={form.driver_name} onChange={updateForm("driver_name")} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Telefono conductor" value={form.driver_phone} onChange={updateForm("driver_phone")} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="DNI conductor" value={form.driver_document} onChange={updateForm("driver_document")} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Kilometraje" type="number" value={form.odometer_km} onChange={updateForm("odometer_km")} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Combustible %" type="number" value={form.fuel_level} onChange={updateForm("fuel_level")} fullWidth inputProps={{ min: 0, max: 100 }} /></Grid>
                <Grid item xs={12}><TextField label="Observaciones" value={form.notes} onChange={updateForm("notes")} fullWidth multiline minRows={2} /></Grid>
              </Grid>

              <Divider />
              <Box>
                <Typography variant="h6">Check de recepcion</Typography>
                <Typography color="text.secondary" variant="body2">Marque los items que presentan problemas.</Typography>
                <Grid container spacing={1} mt={1}>
                  {checklistDefinitions.map(([code, label]) => (
                    <Grid item xs={12} sm={6} md={4} key={code}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Checkbox checked={problemCodes.includes(code)} onChange={() => toggleProblem(code)} />
                        <Typography>{label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Divider />
              <Box>
                <Typography variant="h6">Inspeccion multipunto</Typography>
                <Grid container spacing={2} mt={0.5}>
                  {inspectionDefinitions.map(([code, label, section]) => (
                    <Grid item xs={12} md={6} key={code}>
                      <TextField select label={`${section} - ${label}`} value={inspectionResults[code] || "not_checked"} onChange={(event) => setInspectionResult(code, event.target.value)} fullWidth>
                        <MenuItem value="not_checked">No revisado</MenuItem>
                        <MenuItem value="ok">Correcto</MenuItem>
                        <MenuItem value="future_attention">Atencion futura</MenuItem>
                        <MenuItem value="immediate_attention">Atencion inmediata</MenuItem>
                      </TextField>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saveMutation.isPending}>Guardar recepcion</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(selectedReception)} onClose={() => setSelectedReception(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Danos y fotos - {selectedReception?.reception_number}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} pt={1}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><TextField select label="Zona" value={damageForm.zone} onChange={(e) => setDamageForm((c) => ({ ...c, zone: e.target.value }))} fullWidth><MenuItem value="front">Frente</MenuItem><MenuItem value="rear">Trasera</MenuItem><MenuItem value="left">Lateral izquierdo</MenuItem><MenuItem value="right">Lateral derecho</MenuItem><MenuItem value="roof">Techo</MenuItem><MenuItem value="interior">Interior</MenuItem><MenuItem value="engine">Motor</MenuItem><MenuItem value="wheels">Ruedas</MenuItem><MenuItem value="other">Otro</MenuItem></TextField></Grid>
              <Grid item xs={12} md={3}><TextField label="Pieza/parte" value={damageForm.part_name} onChange={(e) => setDamageForm((c) => ({ ...c, part_name: e.target.value }))} fullWidth /></Grid>
              <Grid item xs={12} md={3}><TextField label="Tipo de dano" value={damageForm.damage_type} onChange={(e) => setDamageForm((c) => ({ ...c, damage_type: e.target.value }))} fullWidth /></Grid>
              <Grid item xs={12} md={3}><TextField select label="Accion" value={damageForm.action_required} onChange={(e) => setDamageForm((c) => ({ ...c, action_required: e.target.value }))} fullWidth><MenuItem value="repair">Reparar</MenuItem><MenuItem value="replace">Cambiar</MenuItem><MenuItem value="observe">Observar</MenuItem></TextField></Grid>
              <Grid item xs={12} md={3}><TextField select label="Gravedad" value={damageForm.severity} onChange={(e) => setDamageForm((c) => ({ ...c, severity: e.target.value }))} fullWidth><MenuItem value="low">Leve</MenuItem><MenuItem value="medium">Media</MenuItem><MenuItem value="high">Alta</MenuItem></TextField></Grid>
              <Grid item xs={12} md={6}><TextField label="Descripcion" value={damageForm.description} onChange={(e) => setDamageForm((c) => ({ ...c, description: e.target.value }))} fullWidth /></Grid>
              <Grid item xs={12} md={3}>
                <Button variant="outlined" component="label" startIcon={<CameraAltIcon />} fullWidth sx={{ height: 40 }}>
                  Foto
                  <input hidden type="file" accept="image/*" onChange={(e) => setDamageForm((c) => ({ ...c, photoFile: e.target.files?.[0] || null }))} />
                </Button>
              </Grid>
              <Grid item xs={12}><Button variant="contained" onClick={() => damageMutation.mutate()} disabled={damageMutation.isPending || !selectedReception}>Agregar dano</Button></Grid>
            </Grid>
            <Table size="small">
              <TableHead><TableRow><TableCell>Zona</TableCell><TableCell>Pieza</TableCell><TableCell>Accion</TableCell><TableCell>Gravedad</TableCell><TableCell>Descripcion</TableCell><TableCell>Foto</TableCell></TableRow></TableHead>
              <TableBody>{damages.map((damage) => <TableRow key={damage.id}><TableCell>{damage.zone_label}</TableCell><TableCell>{damage.part_name || damage.damage_type || "-"}</TableCell><TableCell>{damage.action_required_label}</TableCell><TableCell>{damage.severity_label}</TableCell><TableCell>{damage.description || "-"}</TableCell><TableCell>{damage.photo_url ? <Button href={damage.photo_url} target="_blank">Ver</Button> : "-"}</TableCell></TableRow>)}</TableBody>
            </Table>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSelectedReception(null)}>Cerrar</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
