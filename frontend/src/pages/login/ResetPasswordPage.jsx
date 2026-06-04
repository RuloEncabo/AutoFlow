import { useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { confirmPasswordReset } from "../../api/authApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import LogoMark from "../../components/LogoMark.jsx";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { uid, token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("Las contrasenas no coinciden.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const response = await confirmPasswordReset({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setStatus("success");
      setMessage(response.detail || "Contrasena actualizada correctamente.");
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      setStatus("error");
      setMessage(getApiErrorMessage(error, "No se pudo actualizar la contrasena."));
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      sx={{
        backgroundImage:
          "linear-gradient(195deg, rgba(25,25,25,0.64), rgba(52,71,103,0.58)), url('/assets/bg-sign-in-basic.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <Box
          mx={2}
          mt={-3}
          p={2.5}
          borderRadius={2}
          textAlign="center"
          color="white"
          sx={{
            background: "linear-gradient(195deg, #3D9DD9, #007CB7)",
            boxShadow: "0px 4px 18px 0px rgba(47, 43, 61, 0.1)",
          }}
        >
          <Stack alignItems="center" spacing={1}>
            <LogoMark compact />
            <Typography variant="h4" color="white">
              Nueva contrasena
            </Typography>
          </Stack>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Stack component="form" spacing={2.25} onSubmit={handleSubmit}>
            <Typography color="text.secondary" textAlign="center">
              Defina una nueva contrasena para ingresar a AutoFlow.
            </Typography>
            {message && <Alert severity={status === "success" ? "success" : "error"}>{message}</Alert>}
            <TextField
              label="Nueva contrasena"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              required
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="Mostrar u ocultar contrasena" onClick={() => setShowPassword((value) => !value)} edge="end">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Repetir contrasena"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={status === "loading"} fullWidth>
              {status === "loading" ? "Guardando..." : "Cambiar contrasena"}
            </Button>
            <Button component={RouterLink} to="/login" variant="text">
              Volver al login
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
