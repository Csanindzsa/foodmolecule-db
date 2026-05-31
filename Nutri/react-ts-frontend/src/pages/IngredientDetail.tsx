import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import BiotechIcon from "@mui/icons-material/Biotech";
import LocalDiningIcon from "@mui/icons-material/LocalDining";
import ScienceIcon from "@mui/icons-material/Science";
import { Food, Ingredient } from "../interfaces";
import HazardLevelIndicator from "../components/HazardLevelIndicator";
import { getHazardColor, getHazardLabel } from "../utils/hazardUtils";

interface IngredientDetailProps {
  ingredient: Ingredient;
  foods: Food[];
}

const IngredientDetail: React.FC<IngredientDetailProps> = ({ ingredient, foods }) => {
  const navigate = useNavigate();
  const linkedFoods = foods.filter((food) => food.ingredients.includes(ingredient.id));
  const baseHazardLevel = ingredient.hazard_level || 0;
  const preparationProfiles = [
    {
      method: "Raw",
      hazardLevel: baseHazardLevel,
      note: "Baseline ingredient or molecule rating before preparation effects.",
    },
    {
      method: "Boiled",
      hazardLevel: Math.max(0, baseHazardLevel - 1),
      note: "Rating slot for compounds affected by boiling or leaching.",
    },
    {
      method: "Pressure boiled",
      hazardLevel: Math.max(0, baseHazardLevel - 2),
      note: "Rating slot for pressure-assisted boiling evidence.",
    },
    {
      method: "Pressure cooked",
      hazardLevel: Math.max(0, baseHazardLevel - 2),
      note: "Rating slot for high-pressure cooking evidence.",
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box
        sx={{
          backgroundColor: "#FF8C00",
          py: 3,
          px: 4,
          borderRadius: "10px 10px 0 0",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            {ingredient.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
            <BiotechIcon sx={{ mr: 1 }} />
            <Typography variant="subtitle1">
              Ingredient and molecule profile
            </Typography>
          </Box>
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
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Card elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent>
                <ScienceIcon sx={{ fontSize: 84, color: "#FF8C00", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Safety Snapshot
                </Typography>
                <HazardLevelIndicator
                  hazardLevel={baseHazardLevel}
                  size="large"
                />
                <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
                  {getHazardLabel(baseHazardLevel)}: This placeholder
                  will become the molecule or ingredient safety summary.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Typography variant="h6" gutterBottom>
              Overview
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {ingredient.description ||
                "This page will explain where the ingredient appears, which molecules matter, and what medical literature supports the current assessment."}
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
              <Chip label="Food links" />
              <Chip label="Molecule profile" />
              <Chip label="PubMed papers" />
              <Chip label="Health impact notes" />
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
                Dynamic rating area for AI summaries from PubMed and medical
                literature.
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip label="Evidence summary pending" size="small" variant="outlined" />
                <Chip label="Mechanism notes" size="small" variant="outlined" />
                <Chip label="Confidence score" size="small" variant="outlined" />
              </Box>
            </Box>

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
                mb: 3,
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

            <Typography variant="h6" gutterBottom>
              Foods containing this ingredient
            </Typography>
            {linkedFoods.length > 0 ? (
              <List dense>
                {linkedFoods.map((food) => (
                  <ListItem
                    key={food.id}
                    secondaryAction={
                      <Button size="small" onClick={() => navigate(`/food/${food.id}`)}>
                        View Food
                      </Button>
                    }
                    sx={{
                      border: "1px solid #eee",
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: "background.paper",
                    }}
                  >
                    <LocalDiningIcon sx={{ color: "#FF8C00", mr: 2 }} />
                    <ListItemText
                      primary={food.name}
                      secondary={`${food.serving_size}g reference serving`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                No linked foods yet.
              </Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              PubMed / Medical Papers
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This section will list the studies connected to this ingredient or
              molecule, including year, confidence, and summarized health impact.
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default IngredientDetail;
