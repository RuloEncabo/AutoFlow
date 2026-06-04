import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import LockIcon from "@mui/icons-material/Lock";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { requestPasswordReset } from "../../api/authApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import LogoMark from "../../components/LogoMark.jsx";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await requestPasswordReset(email);
      setStatus("success");
      setMessage(response.detail || "Revise su correo para continuar.");
    } catch (error) {
      setStatus("error");
      setMessage(getApiErrorMessage(error, "No se pudo solicitar la recuperacion."));
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
              Recuperar acceso
            </Typography>
          </Stack>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Stack component="form" spacing={2.25} onSubmit={handleSubmit}>
            <Typography color="text.secondary" textAlign="center">
              Ingrese su email y le enviaremos un enlace para cambiar la contrasena.
            </Typography>
            {message && <Alert severity={status === "success" ? "success" : "error"}>{message}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={status === "loading"} startIcon={<LockIcon />} fullWidth>
              {status === "loading" ? "Enviando..." : "Enviar enlace"}
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
