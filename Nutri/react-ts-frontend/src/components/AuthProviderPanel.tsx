import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import AppleIcon from "@mui/icons-material/Apple";
import CoffeeIcon from "@mui/icons-material/Coffee";
import GoogleIcon from "@mui/icons-material/Google";
import LinkIcon from "@mui/icons-material/Link";
import { API_ENDPOINTS, KOFI_SUPPORT_URL } from "../config/environment";

type AuthProviderPanelProps = {
  mode: "login" | "register";
};

const providerButtonSx = {
  py: 1.35,
  borderRadius: 2,
  justifyContent: "flex-start",
  textTransform: "none",
  fontWeight: 700,
};

const AuthProviderPanel: React.FC<AuthProviderPanelProps> = ({ mode }) => {
  const actionText = mode === "login" ? "Continue" : "Create account";

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 3, sm: 4 },
        borderRadius: "0 0 10px 10px",
        bgcolor: "rgba(255,255,255,0.96)",
      }}
    >
      <Alert severity="info" sx={{ mb: 3 }}>
        Nutrii uses provider sign-in only. No passwords, no verification emails,
        and all providers can be linked under one Nutrii username.
      </Alert>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            href={API_ENDPOINTS.oauthStart("google")}
            startIcon={<GoogleIcon />}
            sx={providerButtonSx}
          >
            {actionText} with Google
          </Button>
        </Grid>

        <Grid item xs={12}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            href={API_ENDPOINTS.oauthStart("apple")}
            startIcon={<AppleIcon />}
            sx={providerButtonSx}
          >
            {actionText} with Apple
          </Button>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }}>
        <Typography variant="body2" color="text.secondary">
          supporter access
        </Typography>
      </Divider>

      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          border: "1px solid #f0e0cd",
          bgcolor: "#fffaf4",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <CoffeeIcon sx={{ color: "#FF8C00" }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Ko-fi support is linked after sign-in
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ko-fi memberships and tips will be matched to your Nutrii account by
          backend webhook data, so the same username can hold Google, Apple, and
          Ko-fi entitlement records.
        </Typography>
        <Button
          variant="contained"
          href={KOFI_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<CoffeeIcon />}
          sx={{
            bgcolor: "#FF8C00",
            "&:hover": { bgcolor: "#e67e00" },
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          Support Nutrii on Ko-fi
        </Button>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Account linking model
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip icon={<GoogleIcon />} label="Google identity" />
          <Chip icon={<AppleIcon />} label="Apple identity" />
          <Chip icon={<CoffeeIcon />} label="Ko-fi supporter" />
          <Chip icon={<LinkIcon />} label="One Nutrii username" />
        </Box>
      </Box>
    </Paper>
  );
};

export default AuthProviderPanel;
