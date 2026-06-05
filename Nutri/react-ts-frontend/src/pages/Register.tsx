import React from "react";
import { Avatar, Box, Container, Typography } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AuthProviderPanel from "../components/AuthProviderPanel";
import { useLocale } from "../localization/useLocale";

const Register = () => {
  const { locale } = useLocale();

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 4, mb: 8 }}>
      <Box
        sx={{
          backgroundColor: "#FF8C00",
          py: 3,
          px: 4,
          borderRadius: "10px 10px 0 0",
          color: "white",
          textAlign: "center",
        }}
      >
        <Avatar
          sx={{
            mx: "auto",
            mb: 1,
            bgcolor: "rgba(255,255,255,0.2)",
            width: 56,
            height: 56,
          }}
        >
          <PersonAddIcon fontSize="large" />
        </Avatar>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {locale.auth.createAccount}
        </Typography>
        <Typography variant="subtitle1">
          {locale.authPages.registerSubtitle}
        </Typography>
      </Box>

      <AuthProviderPanel mode="register" />
    </Container>
  );
};

export default Register;
