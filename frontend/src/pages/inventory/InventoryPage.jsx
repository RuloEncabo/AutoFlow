import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PrintIcon from "@mui/icons-material/Print";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import JsBarcode from "jsbarcode";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createFamily,
  createMaterial,
  createPart,
  deleteFamily,
  deleteMaterial,
  deletePart,
  exportMaterials,
  exportParts,
  listFamilies,
  listMaterials,
  listParts,
  updateFamily,
  updateMaterial,
  updatePart,
} from "../../api/inventoryApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import StatusChip from "../../components/StatusChip.jsx";

const emptyItem = {
  family: "",
  code: "",
  supplier_code: "",
  barcode: "",
  qr_code: "",
  name: "",
  type: "",
  description: "",
  stock: "0.00",
  min_stock: "0.00",
  cost: "0.00",
  status: "active",
};

const emptyFamily = {
  name: "",
  description: "",
  status: "active",
};

function BarcodePreview({ value }) {
  const svgRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 2,
        height: 74,
        displayValue: true,
        fontSize: 14,
        margin: 8,
      });
      setError("");
    } catch {
      setError("No se pudo generar codigo de barra con este valor.");
    }
  }, [value]);

  if (!value) return null;
  return (
    <Stack spacing={1} alignItems="center">
      <svg ref={svgRef} />
      {error && <Alert severity="warning">{error}</Alert>}
    </Stack>
  );
}

function ScannerDialog({ open, title, onClose, onDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const [manualValue, setManualValue] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let closed = false;

    async function startScanner() {
      setMessage("");
      if (!("BarcodeDetector" in window)) {
        setMessage("El navegador no soporta lectura automatica. Ingrese o pegue el codigo manualmente.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("No se pudo acceder a la camara. Ingrese o pegue el codigo manualmente.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (closed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new window.BarcodeDetector({
          formats: ["qr_code", "code_128", "ean_13", "ean_8", "upc_a", "upc_e", "code_39"],
        });
        const scan = async () => {
          if (closed || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
              return;
            }
          } catch {
            setMessage("No se pudo leer automaticamente. Pruebe con ingreso manual.");
          }
          frameRef.current = window.requestAnimationFrame(scan);
        };
        frameRef.current = window.requestAnimationFrame(scan);
      } catch {
        setMessage("No se pudo abrir la camara. Ingrese o pegue el codigo manualmente.");
      }
    }

    startScanner();
    return () => {
      closed = true;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, onDetected]);

  const submitManual = () => {
    const value = manualValue.trim();
    if (value) onDetected(value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} pt={1}>
          {message && <Alert severity="info">{message}</Alert>}
          <Box
            component="video"
            ref={videoRef}
            muted
            playsInline
            sx={{
              width: "100%",
              aspectRatio: "16 / 9",
              bgcolor: "grey.900",
              borderRadius: 1,
              objectFit: "cover",
            }}
          />
          <TextField
            label="Codigo manual"
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value)}
            fullWidth
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={submitManual} disabled={!manualValue.trim()}>
          Usar codigo
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function statusChip(status) {
  return (
    <StatusChip
      label={status === "active" ? "Activo" : "Inactivo"}
      color={status === "active" ? "success" : "default"}
    />
  );
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("parts");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyItem);
  const [familyForm, setFamilyForm] = useState(emptyFamily);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [scannerConfig, setScannerConfig] = useState(null);
  const [codeTarget, setCodeTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const familiesQuery = useQuery({
    queryKey: ["inventory-families"],
    queryFn: () => listFamilies({ page_size: 100 }),
  });
  const partsQuery = useQuery({
    queryKey: ["parts", search],
    queryFn: () => listParts({ page_size: 100, search: search || undefined }),
  });
  const materialsQuery = useQuery({
    queryKey: ["materials", search],
    queryFn: () => listMaterials({ page_size: 100, search: search || undefined }),
  });

  const families = familiesQuery.data?.results || [];
  const currentQuery = tab === "parts" ? partsQuery : tab === "materials" ? materialsQuery : familiesQuery;
  const familyRows = search
    ? families.filter((family) => `${family.name} ${family.description || ""}`.toLowerCase().includes(search.toLowerCase()))
    : families;
  const rows = tab === "families" ? familyRows : currentQuery.data?.results || [];
  const itemTypeLabel = tab === "parts" ? "repuesto" : tab === "materials" ? "material" : "familia";
  const canCreateByScan = tab === "parts" || tab === "materials";

  const saveMutation = useMutation({
    mutationFn: () => {
      if (tab === "families") {
        return editing ? updateFamily(editing.id, familyForm) : createFamily(familyForm);
      }
      const payload = {
        ...form,
        family: form.family || null,
        stock: String(form.stock || "0"),
        min_stock: String(form.min_stock || "0"),
        cost: String(form.cost || "0"),
      };
      if (tab === "parts") return editing ? updatePart(editing.id, payload) : createPart(payload);
      return editing ? updateMaterial(editing.id, payload) : createMaterial(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-families"] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (item) => {
      if (tab === "families") return deleteFamily(item.id);
      return tab === "parts" ? deletePart(item.id) : deleteMaterial(item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-families"] });
      setDeleteTarget(null);
    },
  });

  const codeValue = useMemo(() => {
    if (!codeTarget) return "";
    return codeTarget.barcode || codeTarget.qr_code || codeTarget.supplier_code || codeTarget.code || "";
  }, [codeTarget]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyItem);
    setFamilyForm(emptyFamily);
    setFormOpen(true);
  };

  const openCreateByScan = () => {
    setScannerConfig({ field: "barcode", create: true });
  };

  const openEdit = (item) => {
    setEditing(item);
    if (tab === "families") {
      setFamilyForm({
        name: item.name || "",
        description: item.description || "",
        status: item.status || "active",
      });
    } else {
      setForm({
        family: item.family || "",
        code: item.code || "",
        supplier_code: item.supplier_code || "",
        barcode: item.barcode || "",
        qr_code: item.qr_code || "",
        name: item.name || "",
        type: item.type || "",
        description: item.description || "",
        stock: item.stock || "0.00",
        min_stock: item.min_stock || "0.00",
        cost: item.cost || "0.00",
        status: item.status || "active",
      });
    }
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyItem);
    setFamilyForm(emptyFamily);
    saveMutation.reset();
  };

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateFamilyForm = (field) => (event) => {
    setFamilyForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const openScanner = (field) => {
    setScannerConfig({ field, create: false });
  };

  const handleDetected = (value) => {
    const scanned = value.trim();
    if (!scanned) return;
    if (scannerConfig?.create) {
      setEditing(null);
      setForm({ ...emptyItem, code: scanned, barcode: scanned });
      setFamilyForm(emptyFamily);
      setFormOpen(true);
    } else {
      setForm((current) => ({ ...current, [scannerConfig.field]: scanned }));
    }
    setScannerConfig(null);
  };

  const copyCodeValue = async () => {
    if (codeValue && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(codeValue);
    }
  };

  const printGeneratedCode = () => {
    window.print();
  };

  const handleExport = async (withItems = false) => {
    try {
      const exportFn = tab === "parts" ? exportParts : exportMaterials;
      await exportFn(withItems);
    } catch (error) {
      setToast({ severity: "error", message: getApiErrorMessage(error, "No se pudo exportar inventario.") });
    }
  };

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">Inventario</Typography>
          <Typography color="text.secondary">
            Repuestos, materiales, familias, stock y codigos escaneables.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {canCreateByScan && (
            <>
              <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => handleExport(false)}>
                Excel
              </Button>
              <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => handleExport(true)}>
                Excel con items
              </Button>
            </>
          )}
          {canCreateByScan && (
            <Button variant="outlined" startIcon={<QrCodeScannerIcon />} onClick={openCreateByScan}>
              Alta por lectura
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nuevo {itemTypeLabel}
          </Button>
        </Stack>
      </Box>

      {toast && <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert>}

      <Card>
        <CardContent>
          <Tabs
            value={tab}
            onChange={(_, value) => {
              setTab(value);
              setSearch("");
            }}
            sx={{ mb: 2 }}
          >
            <Tab value="parts" label="Repuestos" />
            <Tab value="materials" label="Materiales" />
            <Tab value="families" label="Familias" />
          </Tabs>

          <TextField
            fullWidth
            placeholder={tab === "families" ? "Buscar familia" : "Buscar por codigo, proveedor, barra, QR, nombre o descripcion"}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {currentQuery.isError && <Alert severity="error">{getApiErrorMessage(currentQuery.error)}</Alert>}

          {tab === "families" ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Familia</TableCell>
                    <TableCell>Descripcion</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((family) => (
                    <TableRow key={family.id} hover>
                      <TableCell><Typography fontWeight={700}>{family.name}</Typography></TableCell>
                      <TableCell>{family.description || "-"}</TableCell>
                      <TableCell>{statusChip(family.status)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar"><IconButton onClick={() => openEdit(family)}><EditIcon /></IconButton></Tooltip>
                        <Tooltip title="Dar de baja"><IconButton color="error" onClick={() => setDeleteTarget(family)}><DeleteIcon /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!currentQuery.isLoading && rows.length === 0 && (
                    <TableRow><TableCell colSpan={4}><Typography color="text.secondary" textAlign="center" py={4}>Sin familias.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Codigo</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Familia</TableCell>
                    {tab === "materials" && <TableCell>Tipo</TableCell>}
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Costo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>{item.code}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.barcode || item.qr_code ? "Escaneable" : "Sin codigo scan"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{item.description || "-"}</Typography>
                      </TableCell>
                      <TableCell>{item.family_name || "-"}</TableCell>
                      {tab === "materials" && <TableCell>{item.type || "-"}</TableCell>}
                      <TableCell>{item.supplier_code || "-"}</TableCell>
                      <TableCell>
                        <Typography color={item.is_critical ? "error.main" : "text.primary"} fontWeight={700}>{item.stock}</Typography>
                        <Typography variant="caption" color="text.secondary">Min {item.min_stock}</Typography>
                      </TableCell>
                      <TableCell>{item.cost}</TableCell>
                      <TableCell>{statusChip(item.status)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Generar QR/barra"><IconButton onClick={() => setCodeTarget(item)}><QrCode2Icon /></IconButton></Tooltip>
                        <Tooltip title="Editar"><IconButton onClick={() => openEdit(item)}><EditIcon /></IconButton></Tooltip>
                        <Tooltip title="Dar de baja"><IconButton color="error" onClick={() => setDeleteTarget(item)}><DeleteIcon /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!currentQuery.isLoading && rows.length === 0 && (
                    <TableRow><TableCell colSpan={tab === "materials" ? 9 : 8}><Typography color="text.secondary" textAlign="center" py={4}>Sin registros.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onClose={closeForm} maxWidth="md" fullWidth>
        <Box component="form" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
          <DialogTitle>{editing ? "Editar" : "Nuevo"} {itemTypeLabel}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              {saveMutation.isError && <Alert severity="error">{getApiErrorMessage(saveMutation.error)}</Alert>}
              {tab === "families" ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}><TextField label="Familia" value={familyForm.name} onChange={updateFamilyForm("name")} required fullWidth /></Grid>
                  <Grid item xs={12} md={4}><TextField select label="Estado" value={familyForm.status} onChange={updateFamilyForm("status")} fullWidth><MenuItem value="active">Activo</MenuItem><MenuItem value="inactive">Inactivo</MenuItem></TextField></Grid>
                  <Grid item xs={12}><TextField label="Descripcion" value={familyForm.description} onChange={updateFamilyForm("description")} fullWidth multiline minRows={2} /></Grid>
                </Grid>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}><TextField label="Codigo interno" value={form.code} onChange={updateForm("code")} required fullWidth /></Grid>
                  <Grid item xs={12} md={4}><TextField label="Cod proveedor" value={form.supplier_code} onChange={updateForm("supplier_code")} fullWidth /></Grid>
                  <Grid item xs={12} md={4}>
                    <TextField select label="Familia" value={form.family} onChange={updateForm("family")} fullWidth>
                      <MenuItem value="">Sin familia</MenuItem>
                      {families.map((family) => <MenuItem key={family.id} value={family.id}>{family.name}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={8}><TextField label="Nombre" value={form.name} onChange={updateForm("name")} required fullWidth /></Grid>
                  {tab === "materials" && <Grid item xs={12} md={4}><TextField label="Tipo" value={form.type} onChange={updateForm("type")} fullWidth /></Grid>}
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Codigo de barra"
                      value={form.barcode}
                      onChange={updateForm("barcode")}
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Leer codigo de barra">
                              <IconButton edge="end" onClick={() => openScanner("barcode")}><QrCodeScannerIcon /></IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Codigo QR"
                      value={form.qr_code}
                      onChange={updateForm("qr_code")}
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Leer QR">
                              <IconButton edge="end" onClick={() => openScanner("qr_code")}><QrCodeScannerIcon /></IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}><TextField label="Stock" type="number" value={form.stock} onChange={updateForm("stock")} fullWidth /></Grid>
                  <Grid item xs={12} md={3}><TextField label="Stock minimo" type="number" value={form.min_stock} onChange={updateForm("min_stock")} fullWidth /></Grid>
                  <Grid item xs={12} md={3}><TextField label="Costo" type="number" value={form.cost} onChange={updateForm("cost")} fullWidth /></Grid>
                  <Grid item xs={12} md={3}><TextField select label="Estado" value={form.status} onChange={updateForm("status")} fullWidth><MenuItem value="active">Activo</MenuItem><MenuItem value="inactive">Inactivo</MenuItem></TextField></Grid>
                  <Grid item xs={12}><TextField label="Descripcion" value={form.description} onChange={updateForm("description")} fullWidth multiline minRows={2} /></Grid>
                </Grid>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForm}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saveMutation.isPending}>Guardar</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(codeTarget)} onClose={() => setCodeTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Generar codigo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} alignItems="center" pt={1}>
            <Typography variant="h6">{codeTarget?.name}</Typography>
            <Typography color="text.secondary">Valor: {codeValue || "Sin codigo disponible"}</Typography>
            {codeValue && (
              <>
                <Box sx={{ p: 2, bgcolor: "white", border: "1px solid", borderColor: "divider" }}>
                  <QRCodeSVG value={codeTarget.qr_code || codeValue} size={180} />
                </Box>
                <Box sx={{ p: 2, bgcolor: "white", border: "1px solid", borderColor: "divider", width: "100%", overflowX: "auto" }}>
                  <BarcodePreview value={codeTarget.barcode || codeValue} />
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<ContentCopyIcon />} onClick={copyCodeValue} disabled={!codeValue}>Copiar valor</Button>
          <Button startIcon={<PrintIcon />} onClick={printGeneratedCode} disabled={!codeValue}>Imprimir</Button>
          <Button onClick={() => setCodeTarget(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <ScannerDialog
        open={Boolean(scannerConfig)}
        title={scannerConfig?.create ? "Alta por lectura" : "Leer codigo"}
        onClose={() => setScannerConfig(null)}
        onDetected={handleDetected}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dar de baja"
        message={`Se dara de baja ${deleteTarget?.name || "este registro"}.`}
        confirmLabel="Dar de baja"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </Stack>
  );
}
