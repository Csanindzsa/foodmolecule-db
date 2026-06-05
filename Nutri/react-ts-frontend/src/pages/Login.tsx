import React from "react";
import { Box, Container, Typography } from "@mui/material";
import AuthProviderPanel from "../components/AuthProviderPanel";
import { useLocale } from "../localization/useLocale";
import { User } from "../interfaces";

interface LoginProps {
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  setUserData: React.Dispatch<React.SetStateAction<User>>;
}

const Login: React.FC<LoginProps> = () => {
  const { locale } = useLocale();

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Box
        sx={{
          backgroundColor: "#FF8C00",
          py: 3,
          px: 4,
          borderRadius: "10px 10px 0 0",
          color: "white",
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {locale.authPages.loginTitle}
        </Typography>
        <Typography variant="subtitle1">
          {locale.authPages.loginSubtitle}
        </Typography>
      </Box>

      <AuthProviderPanel mode="login" />
    </Container>
  );
};

export default Login;
