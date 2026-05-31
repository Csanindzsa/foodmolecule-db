import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import AppleIcon from "@mui/icons-material/Apple";
import CoffeeIcon from "@mui/icons-material/Coffee";
import EmailIcon from "@mui/icons-material/Email";
import GoogleIcon from "@mui/icons-material/Google";
import LinkIcon from "@mui/icons-material/Link";
import PersonIcon from "@mui/icons-material/Person";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { API_BASE_URL, API_ENDPOINTS, KOFI_SUPPORT_URL } from "../config/environment";

interface EditUserProps {
  accessToken: string | null;
  userData: {
    user_id?: number;
    username?: string;
    email?: string;
  };
  setUserData: React.Dispatch<
    React.SetStateAction<{
      user_id?: number;
      username?: string;
      email?: string;
    }>
  >;
  setAccessToken?: React.Dispatch<React.SetStateAction<string | null>>;
  setRefreshToken?: React.Dispatch<React.SetStateAction<string | null>>;
}

const linkButtonSx = {
  py: 1.2,
  justifyContent: "flex-start",
  textTransform: "none",
  fontWeight: 700,
  borderRadius: 2,
};

const EditUser: React.FC<EditUserProps> = ({
  accessToken,
  userData,
  setUserData,
}) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (userData) {
      setUsername(userData.username || "");
      setEmail(userData.email || "");
    }
  }, [userData]);

  useEffect(() => {
    if (!accessToken) {
      navigate("/login");
    }
  }, [accessToken, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/users/edit/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ username, email }),
      });

      if (response.ok) {
        const data = await response.json();

        setUserData((prevData) => ({
          ...prevData,
          username: data.user.username,
          email: data.user.email,
        }));

        setSuccessMessage("Account updated successfully");
        window.scrollTo(0, 0);
      } else {
        const errorData = await response.json();
        const newErrors: Record<string, string> = {};

        if (errorData.username) {
          newErrors.username = Array.isArray(errorData.username)
            ? errorData.username[0]
            : errorData.username;
        }

        if (errorData.email) {
          newErrors.email = Array.isArray(errorData.email)
            ? errorData.email[0]
            : errorData.email;
        }

        if (errorData.detail) {
          newErrors.general = errorData.detail;
        }

        setErrors(newErrors);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
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
          Account
        </Typography>
        <Typography variant="subtitle1">
          Manage your Nutrii username and connected providers
        </Typography>
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: "0 0 10px 10px",
          bgcolor: "rgba(255,255,255,0.95)",
        }}
      >
        {successMessage && (
          <Alert severity="success" sx={{ mb: 4 }}>
            {successMessage}
          </Alert>
        )}

        {errors.general && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {errors.general}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} display="flex" justifyContent="center" mb={2}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: "#FF8C00",
                  fontSize: "2.5rem",
                }}
              >
                {userData.username ? userData.username[0].toUpperCase() : "U"}
              </Avatar>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="username"
                    label="Username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    error={!!errors.username}
                    helperText={
                      errors.username ||
                      "This is the shared Nutrii identity across linked providers."
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="email"
                    label="Primary email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!errors.email}
                    helperText={
                      errors.email ||
                      "Used for account recovery and Ko-fi supporter matching."
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} mt={2}>
              <Typography variant="h6" gutterBottom>
                Connected Providers
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Alert severity="info" sx={{ mb: 2 }}>
                Connect multiple providers to the same Nutrii account so Google,
                Apple, and Ko-fi support can all map to one username.
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    href={API_ENDPOINTS.oauthLink("google")}
                    startIcon={<GoogleIcon />}
                    sx={linkButtonSx}
                  >
                    Connect Google
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    href={API_ENDPOINTS.oauthLink("apple")}
                    startIcon={<AppleIcon />}
                    sx={linkButtonSx}
                  >
                    Connect Apple
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    href={KOFI_SUPPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<CoffeeIcon />}
                    sx={{
                      ...linkButtonSx,
                      bgcolor: "#FF8C00",
                      "&:hover": { bgcolor: "#e67e00" },
                    }}
                  >
                    Support on Ko-fi
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip icon={<GoogleIcon />} label="Google" />
                <Chip icon={<AppleIcon />} label="Apple" />
                <Chip icon={<CoffeeIcon />} label="Ko-fi entitlement" />
                <Chip icon={<LinkIcon />} label="One account" />
              </Box>
            </Grid>

            <Grid
              item
              xs={12}
              sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 2 }}
            >
              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={isLoading}
                startIcon={<SaveIcon />}
                sx={{
                  bgcolor: "#FF8C00",
                  "&:hover": {
                    bgcolor: "#e07c00",
                  },
                  px: 4,
                }}
              >
                {isLoading ? "Saving..." : "Save Account"}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => navigate("/")}
                disabled={isLoading}
                startIcon={<CancelIcon />}
              >
                Cancel
              </Button>
            </Grid>

            <Grid item xs={12} sx={{ mt: 4, textAlign: "center" }}>
              <Divider sx={{ mb: 2 }} />
              <Button
                color="error"
                onClick={() => navigate("/delete-user")}
                sx={{ mt: 1 }}
              >
                Delete My Account
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditUser;
