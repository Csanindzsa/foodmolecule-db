import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  SelectChangeEvent, // Import the correct type for Select onChange
  Avatar,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { API_BASE_URL } from "../config/environment";
import { useLocale } from "../localization/useLocale";

interface SupportProps {
  accessToken: string | null;
  userData: {
    user_id?: number;
    username?: string;
    email?: string;
  };
}

const Support: React.FC<SupportProps> = ({ accessToken, userData }) => {
  const navigate = useNavigate();
  const { locale } = useLocale();
  // Form state
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general_question");
  const [userEmail, setUserEmail] = useState(userData.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Support categories
  const supportCategories = [
    { value: "general_question", label: locale.supportPage.categories.generalQuestion },
    { value: "account_issues", label: locale.supportPage.categories.accountIssues },
    { value: "food_data_questions", label: locale.supportPage.categories.foodDataQuestions },
    { value: "restaurant_information", label: locale.supportPage.categories.restaurantInformation },
    { value: "report_a_bug", label: locale.supportPage.categories.reportBug },
    { value: "feature_request", label: locale.supportPage.categories.featureRequest },
    { value: "other", label: locale.supportPage.categories.other },
  ];

  // Fixed handler for Select component - using the correct type
  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!subject.trim() || !message.trim() || !userEmail.trim()) {
      setError(locale.supportPage.requiredFields);
      return;
    }

    // Email validation
    if (!validateEmail(userEmail)) {
      setError(locale.supportPage.invalidEmail);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ticket/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
        body: JSON.stringify({
          subject,
          message,
          category,
          // userName: userData.username || "Anonymous User",
          email: userEmail,
        }),
      });
    
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
    
      setSuccess(true);
      setFormSubmitted(true);
    
      // Optional delay before redirect to let user see the success Snackbar
      setTimeout(() => {
        navigate("/"); // Redirect to home page
      }, 2000);
    } catch (err) {
      console.error("Error submitting ticket:", err);
      setError(
        locale.supportPage.sendFailed
      );
    }
    
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
  };

  const handleSendAnother = () => {
    setFormSubmitted(false);
    setSubject("");
    setMessage("");
    setCategory(supportCategories[0].value);
    setSuccess(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Header */}
      <Box
        sx={{
          backgroundColor: "#FF8C00",
          py: 3,
          px: 4,
          borderRadius: "10px 10px 0 0",
          mb: 0,
          color: "white",
          display: "flex",
          alignItems: "center",
        }}
      >
        <HelpOutlineIcon sx={{ fontSize: 36, mr: 2 }} />
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            {locale.supportPage.title}
          </Typography>
          <Typography variant="subtitle1">
            {locale.supportPage.subtitle}
          </Typography>
        </Box>
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: "0 0 10px 10px",
          bgcolor: "rgba(255,255,255,0.95)",
        }}
      >
        {formSubmitted ? (
          <Box textAlign="center" py={4}>
            <Avatar
              sx={{
                bgcolor: "success.light",
                width: 80,
                height: 80,
                margin: "0 auto 20px",
              }}
            >
              <CheckCircleOutlineIcon sx={{ fontSize: 50, color: "white" }} />
            </Avatar>
            <Typography variant="h5" gutterBottom>
              {locale.supportPage.successTitle}
            </Typography>
            <Typography variant="body1" paragraph>
              {locale.supportPage.successMessage} {userEmail}
            </Typography>
            <Grid container spacing={3} justifyContent="center">
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSendAnother}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    bgcolor: "#FF8C00",
                    "&:hover": { bgcolor: "#e67e00" },
                  }}
                >
                  {locale.supportPage.sendAnother}
                </Button>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Typography paragraph>
              {locale.supportPage.intro}
            </Typography>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="category-label">{locale.supportPage.category}</InputLabel>
                    <Select
                      labelId="category-label"
                      id="category"
                      value={category}
                      label={locale.supportPage.category}
                      onChange={handleCategoryChange}
                    >
                      {supportCategories.map((cat) => (
                        <MenuItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={locale.supportPage.subject}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={locale.supportPage.message}
                    multiline
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    variant="outlined"
                    placeholder={locale.supportPage.messagePlaceholder}
                  />
                </Grid>

                {/* Email field - populated with user's email if logged in, but still editable */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={locale.supportPage.email}
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    variant="outlined"
                    placeholder={locale.supportPage.emailPlaceholder}
                    required
                    helperText={locale.supportPage.emailHelper}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={
                      loading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <SendIcon />
                      )
                    }
                    disabled={loading}
                    sx={{
                      mt: 2,
                      py: 1.5,
                      bgcolor: "#FF8C00",
                      "&:hover": { bgcolor: "#e67e00" },
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    {loading ? locale.supportPage.sending : locale.supportPage.sendMessage}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </>
        )}
      </Paper>

      {/* Success snackbar */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleClose} severity="success" sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <CheckCircleOutlineIcon sx={{ mr: 1 }} />
            <Typography>{locale.supportPage.successToast}</Typography>
          </Box>
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Support;
