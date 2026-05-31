import React from "react";
import { Box, Container, Typography } from "@mui/material";
import AuthProviderPanel from "../components/AuthProviderPanel";

interface LoginProps {
  setAccessToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  setUserData: (userData: any) => void;
}

const Login: React.FC<LoginProps> = () => {
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
          Log In
        </Typography>
        <Typography variant="subtitle1">
          Continue with a trusted provider.
        </Typography>
      </Box>

      <AuthProviderPanel mode="login" />
    </Container>
  );
};

export default Login;
