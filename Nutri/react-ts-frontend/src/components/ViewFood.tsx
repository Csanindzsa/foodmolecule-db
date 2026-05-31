import React, { useState } from "react";
import { EntityId, Food, Ingredient, MacroTable } from "../interfaces";
import { useNavigate } from "react-router-dom"; // Add this import
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Divider,
  Card,
  CardMedia,
  Container,
  Button, // Add this import
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import LocalDiningIcon from "@mui/icons-material/LocalDining";
import EditIcon from "@mui/icons-material/Edit"; // Add this import
import DeleteIcon from "@mui/icons-material/Delete"; // Add this import
import { styled } from "@mui/material/styles";
import { API_ENDPOINTS } from "../config/environment"; // Add this import
import HazardLevelIndicator from "./HazardLevelIndicator";
import { getHazardLabel, getHazardColor } from "../utils/hazardUtils"; // Update import to include getHazardColor

interface ViewFoodProps {
  food: Food;
  ingredients: Ingredient[];
  accessToken?: string | null; // Add this prop
}

// Styled components for nutrition facts table
const NutritionFactsContainer = styled(Box)(({ theme }) => ({
  border: "1px solid #000",
  padding: theme.spacing(2),
  width: "100%",
  maxWidth: "100%",
  margin: "0 auto",
  fontFamily: '"Helvetica", "Arial", sans-serif',
  backgroundColor: "white",
}));

const NutritionFactsHeader = styled(Typography)({
  fontSize: "2rem",
  fontWeight: "bold",
  borderBottom: "10px solid black",
  paddingBottom: "5px",
  margin: "0 0 5px 0",
});

const NutritionRow = styled(Box)<{
  bold?: boolean;
  indent?: boolean;
  doubleIndent?: boolean;
  noBorder?: boolean;
}>(({ bold, indent, doubleIndent, noBorder }) => ({
  display: "flex",
  justifyContent: "space-between",
  padding: "2px 0",
  borderBottom: noBorder ? "none" : "1px solid #ddd",
  fontWeight: bold ? "bold" : "normal",
  paddingLeft: doubleIndent ? "30px" : indent ? "15px" : "0",
}));

const ThickDivider = styled(Box)({
  borderBottom: "5px solid #000",
  marginTop: "5px",
  marginBottom: "5px",
});

const MediumDivider = styled(Box)({
  borderBottom: "3px solid #000",
  marginTop: "3px",
  marginBottom: "3px",
});

const ViewFood: React.FC<ViewFoodProps> = ({
  food,
  ingredients,
  accessToken,
}) => {
  const navigate = useNavigate();
  // Add state for deletion dialog and feedback
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  // Add handler function for edit button
  const handleEditFood = () => {
    navigate(`/food/${food.id}/edit`);
  };

  // Add handlers for deletion
  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteReason("");
  };

  const handleRequestDeletion = async () => {
    if (!accessToken) {
      // Add specific error message for missing token
      setNotification({
        message: "You need to be logged in to request deletion",
        severity: "error",
      });
      handleCloseDeleteDialog();
      return;
    }

    setSubmitting(true);

    try {
      console.log(
        "Making deletion request with token:",
        accessToken.substring(0, 10) + "..."
      );

      const response = await fetch(API_ENDPOINTS.proposeRemoval(food.id), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`, // Ensure correct spacing and format
        },
        body: JSON.stringify({ reason: deleteReason }),
      });

      if (response.ok) {
        setNotification({
          message:
            "Deletion request submitted successfully. It will be reviewed by supervisors.",
          severity: "success",
        });
        handleCloseDeleteDialog();
      } else if (response.status === 401) {
        // Handle unauthorized specifically
        setNotification({
          message:
            "Authentication error: Your session may have expired. Please log in again.",
          severity: "error",
        });
        handleCloseDeleteDialog();
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Failed to submit deletion request"
        );
      }
    } catch (error) {
      console.error("Error requesting food deletion:", error);
      setNotification({
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit deletion request",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  // Update this function to return more information about each ingredient
  const getIngredientDetails = (
    ingredientIds: EntityId[]
  ): { id: EntityId; name: string; hazardLevel: number }[] => {
    return ingredientIds.map((id) => {
      const ingredient = ingredients.find((ing) => ing.id === id);
      return {
        id,
        name: ingredient ? ingredient.name : `Unknown Ingredient (ID: ${id})`,
        hazardLevel: ingredient ? ingredient.hazard_level : 0,
      };
    });
  };

  const handleIngredientClick = (ingredientId: EntityId) => {
    navigate(`/ingredient/${ingredientId}`);
  };

  const baseHazardLevel = food.hazard_level || 0;
  const preparationProfiles = [
    {
      method: "Raw",
      hazardLevel: baseHazardLevel,
      note: "Baseline rating from linked ingredients and literature.",
    },
    {
      method: "Boiled",
      hazardLevel: Math.max(0, baseHazardLevel - 1),
      note: "May reduce heat-sensitive compounds and water-soluble anti-nutrients.",
    },
    {
      method: "Pressure boiled",
      hazardLevel: Math.max(0, baseHazardLevel - 2),
      note: "Higher heat and pressure may reduce some anti-nutrient burden.",
    },
    {
      method: "Pressure cooked",
      hazardLevel: Math.max(0, baseHazardLevel - 2),
      note: "Separate rating slot for pressure-cooking evidence.",
    },
  ];

  // Function for formatting numbers consistently
  const formatNutritionValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "0";

    // For values that are close to integers, don't show decimals
    if (Math.abs(value - Math.round(value)) < 0.01) {
      return Math.round(value).toString();
    }

    // Otherwise show one decimal place
    return value.toFixed(1);
  };

  // Function to render the macro table in a more appealing way
  const renderMacroTable = (
    macros: MacroTable | undefined,
    servingSize?: number
  ) => {
    if (!macros)
      return <Typography>No nutritional information available</Typography>;

    // Calculate calories from fat
    const caloriesFromFat = macros.fat ? macros.fat * 9 : 0;

    // Set serving size with a default value if not provided
    const servingSizeValue = servingSize || 100;

    return (
      <NutritionFactsContainer>
        <NutritionFactsHeader>Nutrition Facts</NutritionFactsHeader>

        <NutritionRow>
          <Typography>Serving Size</Typography>
          <Typography>{servingSizeValue}g</Typography>
        </NutritionRow>

        <ThickDivider />

        <NutritionRow bold>
          <Typography>Amount Per Serving</Typography>
        </NutritionRow>

        <NutritionRow bold>
          <Typography variant="h6">Calories</Typography>
          <Typography variant="h6">
            {formatNutritionValue(macros.energy_kcal)}
          </Typography>
        </NutritionRow>

        <NutritionRow>
          <Typography>Calories from Fat</Typography>
          <Typography>{Math.round(caloriesFromFat)}</Typography>
        </NutritionRow>

        <ThickDivider />

        <NutritionRow noBorder>
          <Typography align="right" variant="caption">
            % Daily Value*
          </Typography>
        </NutritionRow>

        <NutritionRow bold>
          <Typography>Total Fat</Typography>
          <Typography>{formatNutritionValue(macros.fat)}g</Typography>
        </NutritionRow>

        <NutritionRow indent>
          <Typography>Saturated Fat</Typography>
          <Typography>{formatNutritionValue(macros.saturated_fat)}g</Typography>
        </NutritionRow>

        <NutritionRow bold>
          <Typography>Total Carbohydrates</Typography>
          <Typography>{formatNutritionValue(macros.carbohydrates)}g</Typography>
        </NutritionRow>

        <NutritionRow indent>
          <Typography>Dietary Fiber</Typography>
          <Typography>{formatNutritionValue(macros.fiber)}g</Typography>
        </NutritionRow>

        <NutritionRow indent>
          <Typography>Sugars</Typography>
          <Typography>{formatNutritionValue(macros.sugars)}g</Typography>
        </NutritionRow>

        <NutritionRow bold>
          <Typography>Protein</Typography>
          <Typography>{formatNutritionValue(macros.protein)}g</Typography>
        </NutritionRow>

        <MediumDivider />

        <NutritionRow>
          <Typography>Salt</Typography>
          <Typography>{formatNutritionValue(macros.salt)}g</Typography>
        </NutritionRow>

        <ThickDivider />

        <Typography variant="caption">
          * Percent Daily Values are based on a 2,000 calorie diet. Your daily
          values may be higher or lower depending on your calorie needs.
        </Typography>
      </NutritionFactsContainer>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Header with orange background */}
      <Box
        sx={{
          backgroundColor: "#FF8C00",
          py: 3,
          px: 4,
          borderRadius: "10px 10px 0 0",
          mb: 0,
          color: "white",
          display: "flex",
          justifyContent: "space-between", // Add this for button alignment
          alignItems: "center", // Add this for vertical alignment
        }}
      >
        <div>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            {food.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
            <RestaurantIcon sx={{ mr: 1 }} />
            <Typography variant="subtitle1">
              {food.restaurant_name || "Unknown Restaurant"}
            </Typography>
          </Box>
        </div>

        {/* Action buttons - only shown when accessToken is available */}
        {accessToken && (
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleOpenDeleteDialog}
              sx={{
                bgcolor: "rgba(211, 47, 47, 0.9)",
                color: "white",
                "&:hover": {
                  bgcolor: "rgb(211, 47, 47)",
                },
              }}
            >
              Request Deletion
            </Button>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<EditIcon />}
              onClick={handleEditFood}
              sx={{
                bgcolor: "white",
                color: "#FF8C00",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.9)",
                },
              }}
            >
              Edit Food
            </Button>
          </Box>
        )}
      </Box>

      {/* Main Content */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: "0 0 10px 10px",
          bgcolor: "rgba(255,255,255,0.95)",
        }}
      >
        <Grid container spacing={4}>
          {/* Food Image - Fixed height to prevent stretching */}
          <Grid item xs={12} md={5}>
            <Card
              elevation={2}
              sx={{
                height: "auto", // Change from 100% to auto
                maxHeight: 450, // Add a maximum height
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: 2,
              }}
            >
              {food.image ? (
                <CardMedia
                  component="img"
                  image={food.image}
                  alt={food.name}
                  sx={{
                    height: 350,
                    objectFit: "cover",
                    width: "100%",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: 350,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(0,0,0,0.04)",
                  }}
                >
                  <LocalDiningIcon
                    sx={{ fontSize: 100, color: "rgba(0,0,0,0.2)" }}
                  />
                </Box>
              )}
            </Card>
          </Grid>

          {/* Food Details */}
          <Grid item xs={12} md={7}>
            <Box>
              {/* Hazard Level Indicator - Add this section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Hazard Level
                </Typography>
                <Box sx={{ maxWidth: "300px" }}>
                  <HazardLevelIndicator
                    hazardLevel={food.hazard_level || 0}
                    size="large"
                  />
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, color: "text.secondary" }}
                  >
                    {getHazardLabel(baseHazardLevel)}: This food has been
                    rated based on its ingredients.
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #f0e0cd",
                  bgcolor: "#fffaf4",
                }}
              >
                <Typography variant="h6" gutterBottom>
                  AI Research Rating
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Dynamic rating area for the AI summary generated from PubMed and
                  medical papers.
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  <Chip
                    label="Evidence summary pending"
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label="Paper citations"
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label="Confidence score"
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Box>

              {/* Dietary Properties */}
              <Typography variant="h6" gutterBottom>
                Dietary Information
              </Typography>
              <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip
                  icon={food.is_organic ? <CheckIcon /> : <CancelIcon />}
                  label="Organic"
                  color={food.is_organic ? "success" : "default"}
                  variant={food.is_organic ? "filled" : "outlined"}
                />
                <Chip
                  icon={food.is_gluten_free ? <CheckIcon /> : <CancelIcon />}
                  label="Gluten Free"
                  color={food.is_gluten_free ? "primary" : "default"}
                  variant={food.is_gluten_free ? "filled" : "outlined"}
                />
                <Chip
                  icon={food.is_alcohol_free ? <CheckIcon /> : <CancelIcon />}
                  label="Alcohol Free"
                  color={food.is_alcohol_free ? "primary" : "default"}
                  variant={food.is_alcohol_free ? "filled" : "outlined"}
                />
                <Chip
                  icon={food.is_lactose_free ? <CheckIcon /> : <CancelIcon />}
                  label="Lactose Free"
                  color={food.is_lactose_free ? "primary" : "default"}
                  variant={food.is_lactose_free ? "filled" : "outlined"}
                />
              </Box>

              {/* Serving Size */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Serving Size:
                </Typography>
                <Typography variant="body1">
                  {food.serving_size
                    ? `${food.serving_size} g`
                    : "Not specified"}
                </Typography>
              </Box>

              {/* Ingredients Section */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Ingredients
              </Typography>
              <Box sx={{ mb: 3 }}>
                {food.ingredients && food.ingredients.length > 0 ? (
                  <Box
                    sx={{
                      maxHeight: 220,
                      overflowY: "auto",
                      pr: 1,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      alignContent: "flex-start",
                      "&::-webkit-scrollbar": {
                        width: 8,
                      },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "rgba(0,0,0,0.2)",
                        borderRadius: 4,
                      },
                      "&::-webkit-scrollbar-track": {
                        backgroundColor: "rgba(0,0,0,0.05)",
                        borderRadius: 4,
                      },
                    }}
                  >
                    {getIngredientDetails(food.ingredients).map((ingredient) => (
                      <Tooltip
                        key={ingredient.id}
                        title={`${getHazardLabel(
                          ingredient.hazardLevel
                        )} - open ingredient profile`}
                      >
                        <Button
                          variant="outlined"
                          onClick={() => handleIngredientClick(ingredient.id)}
                          sx={{
                            maxWidth: { xs: "100%", sm: 260 },
                            minWidth: 0,
                            px: 1.25,
                            py: 0.75,
                            borderRadius: 999,
                            borderColor: getHazardColor(ingredient.hazardLevel),
                            color: "text.primary",
                            bgcolor: `${getHazardColor(
                              ingredient.hazardLevel
                            )}12`,
                            textTransform: "none",
                            justifyContent: "flex-start",
                            gap: 1,
                            "&:hover": {
                              borderColor: getHazardColor(
                                ingredient.hazardLevel
                              ),
                              bgcolor: `${getHazardColor(
                                ingredient.hazardLevel
                              )}24`,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              minWidth: 22,
                              minHeight: 22,
                              borderRadius: "50%",
                              bgcolor: getHazardColor(ingredient.hazardLevel),
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            {ingredient.hazardLevel}
                          </Box>
                          <Typography
                            variant="body2"
                            component="span"
                            noWrap
                            sx={{ minWidth: 0 }}
                          >
                            {ingredient.name}
                          </Typography>
                        </Button>
                      </Tooltip>
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    No ingredients listed
                  </Typography>
                )}

                {/* Add a legend for hazard levels */}
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    border: "1px solid #eee",
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Ingredient Hazard Level Legend:
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}
                  >
                    {[0, 1, 2, 3, 4].map((level) => (
                      <Box
                        key={level}
                        sx={{ display: "flex", alignItems: "center" }}
                      >
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            bgcolor: getHazardColor(level),
                            mr: 1,
                          }}
                        />
                        <Typography variant="caption">
                          {level}: {getHazardLabel(level)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Preparation Method Ratings
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  {preparationProfiles.map((profile) => (
                    <Box
                      key={profile.method}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: "1px solid #eee",
                        bgcolor: `${getHazardColor(profile.hazardLevel)}10`,
                        minWidth: 0,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {profile.method}
                        </Typography>
                        <Chip
                          label={`${profile.hazardLevel} · ${getHazardLabel(
                            profile.hazardLevel
                          )}`}
                          size="small"
                          sx={{
                            bgcolor: getHazardColor(profile.hazardLevel),
                            color: profile.hazardLevel === 2 ? "#333" : "#fff",
                            fontWeight: 700,
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {profile.note}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* ...existing serving size section... */}
            </Box>
          </Grid>

          {/* Nutritional Information Section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Nutritional Information
            </Typography>
            <Box sx={{ mx: "auto", width: "100%" }}>
              {renderMacroTable(food.macro_table, food.serving_size)}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Request Food Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to request deletion of "{food.name}"? Please
            provide a reason for this request. This will need to be approved by
            supervisors before the food is removed.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="reason"
            label="Reason for deletion"
            type="text"
            fullWidth
            variant="outlined"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            required
            multiline
            rows={3}
            sx={{ mt: 2 }}
            disabled={submitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleRequestDeletion}
            color="error"
            disabled={!deleteReason.trim() || submitting}
          >
            {submitting ? "Submitting..." : "Request Deletion"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.severity}
          sx={{ width: "100%" }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ViewFood;
