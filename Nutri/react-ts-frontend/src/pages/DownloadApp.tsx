import React from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import AndroidIcon from "@mui/icons-material/Android";
import AppleIcon from "@mui/icons-material/Apple";
import CoffeeIcon from "@mui/icons-material/Coffee";
import DocumentScannerIcon from "@mui/icons-material/DocumentScanner";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ScienceIcon from "@mui/icons-material/Science";
import KoFiButton from "../components/KoFiButton";
import { KOFI_SUPPORT_URL } from "../config/environment";

const plannedFeatures = [
  {
    title: "OCR label scanning",
    text: "Scan ingredient labels with your phone camera and match them against Nutrii's ingredient and molecule database.",
    icon: <DocumentScannerIcon />,
  },
  {
    title: "Food and molecule lookup",
    text: "Open food, ingredient, molecule, preparation method, and safety pages without needing to sit at a desktop.",
    icon: <ScienceIcon />,
  },
  {
    title: "Supporter beta access",
    text: "Ko-fi supporters will get earlier release builds and beta testing access before the wider public rollout.",
    icon: <CoffeeIcon />,
  },
];

const releaseSteps = [
  "Web database and ingredient pages first",
  "OCR scanning prototype",
  "Ko-fi supporter beta",
  "Public iOS and Android release",
];

const DownloadApp: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box
        sx={{
          backgroundColor: "#FF8C00",
          py: { xs: 4, md: 6 },
          px: { xs: 3, md: 5 },
          borderRadius: "10px 10px 0 0",
          color: "white",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" },
          gap: 4,
          alignItems: "center",
        }}
      >
        <Box>
          <Chip
            label="Mobile app coming soon"
            sx={{
              mb: 2,
              bgcolor: "rgba(255,255,255,0.18)",
              color: "white",
              fontWeight: 700,
            }}
          />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, mb: 2 }}>
            Nutrii in your pocket
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.95, mb: 3 }}>
            The mobile app will bring Nutrii's food and ingredient research to
            real-world shopping, cooking, and label reading.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Chip icon={<AppleIcon />} label="iOS planned" sx={{ bgcolor: "white" }} />
            <Chip icon={<AndroidIcon />} label="Android planned" sx={{ bgcolor: "white" }} />
            <Chip icon={<DocumentScannerIcon />} label="OCR scanning" sx={{ bgcolor: "white" }} />
          </Box>
        </Box>

        <Box
          sx={{
            mx: "auto",
            width: { xs: 190, sm: 220 },
            height: { xs: 360, sm: 410 },
            borderRadius: 8,
            border: "10px solid rgba(255,255,255,0.9)",
            bgcolor: "#fffaf4",
            boxShadow: "0 24px 54px rgba(88,44,0,0.28)",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box sx={{ height: 18, width: 70, borderRadius: 999, bgcolor: "#222", mx: "auto" }} />
          <Box
            sx={{
              flex: 1,
              borderRadius: 5,
              bgcolor: "rgba(255,140,0,0.1)",
              p: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              gap: 1.5,
            }}
          >
            <PhoneIphoneIcon sx={{ fontSize: 58, color: "#FF8C00" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Scan a label
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Identify ingredients, molecules, and preparation notes.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: "0 0 10px 10px",
          bgcolor: "rgba(255,255,255,0.96)",
        }}
      >
        <Grid container spacing={3}>
          {plannedFeatures.map((feature) => (
            <Grid item xs={12} md={4} key={feature.title}>
              <Box
                sx={{
                  height: "100%",
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #f0e0cd",
                  bgcolor: "#fffaf4",
                }}
              >
                <Box sx={{ color: "#FF8C00", mb: 1 }}>{feature.icon}</Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.text}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              Ko-fi supporters get earlier access
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Nutrii will stay free on the web. Ko-fi support helps fund
              hosting, database work, AI-assisted paper summaries, and mobile
              development. Supporters will be first in line for beta builds,
              testing feedback, and early OCR scanning releases.
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Chip icon={<RocketLaunchIcon />} label="Early builds" />
              <Chip icon={<NotificationsActiveIcon />} label="Beta updates" />
              <Chip icon={<CoffeeIcon />} label="Supporter access" />
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box
              sx={{
                display: "flex",
                justifyContent: { xs: "flex-start", md: "center" },
              }}
            >
              <KoFiButton
                href={KOFI_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
              />
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          Planned release path
        </Typography>
        <Grid container spacing={2}>
          {releaseSteps.map((step, index) => (
            <Grid item xs={12} sm={6} md={3} key={step}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: index === 0 ? "rgba(255,140,0,0.12)" : "#f8f8f8",
                  border: "1px solid rgba(0,0,0,0.08)",
                  minHeight: 100,
                }}
              >
                <Typography sx={{ color: "#FF8C00", fontWeight: 800, mb: 1 }}>
                  {String(index + 1).padStart(2, "0")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {step}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <Button variant="contained" disabled sx={{ bgcolor: "#bbb" }}>
            App Store coming later
          </Button>
          <Button variant="contained" disabled sx={{ bgcolor: "#bbb" }}>
            Google Play coming later
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default DownloadApp;
