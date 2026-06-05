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
import KoFiButton from "./KoFiButton";
import { useLocale } from "../localization/useLocale";

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
  const { locale } = useLocale();

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
        {locale.authPages.providerInfo}
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
            {mode === "login"
              ? locale.authPages.continueWithGoogle
              : locale.authPages.createAccountWithGoogle}
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
            {mode === "login"
              ? locale.authPages.continueWithApple
              : locale.authPages.createAccountWithApple}
          </Button>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {locale.authPages.supporterAccess}
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
            {locale.authPages.kofiLinkedTitle}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {locale.authPages.kofiLinkedDescription}
        </Typography>
        <KoFiButton
          fullWidth
          href={KOFI_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ maxWidth: 360 }}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          {locale.authPages.accountLinkingModel}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip icon={<GoogleIcon />} label={locale.authPages.googleIdentity} />
          <Chip icon={<AppleIcon />} label={locale.authPages.appleIdentity} />
          <Chip icon={<CoffeeIcon />} label={locale.authPages.kofiSupporter} />
          <Chip icon={<LinkIcon />} label={locale.authPages.oneNutriiUsername} />
        </Box>
      </Box>
    </Paper>
  );
};

export default AuthProviderPanel;
