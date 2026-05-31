import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  Grid,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import BiotechIcon from "@mui/icons-material/Biotech";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Food, Ingredient } from "../interfaces";
import HazardLevelIndicator from "../components/HazardLevelIndicator";

interface IngredientListProps {
  ingredients: Ingredient[];
  foods: Food[];
}

const IngredientList: React.FC<IngredientListProps> = ({ ingredients, foods }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredIngredients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return ingredients;

    return ingredients.filter((ingredient) =>
      [ingredient.name, ingredient.description || ""].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [ingredients, searchTerm]);

  const foodsForIngredient = (ingredientId: number) =>
    foods.filter((food) => food.ingredients.includes(ingredientId));

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
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
          Ingredient Explorer
        </Typography>
        <Typography variant="subtitle1">
          Browse ingredients and molecules connected to foods
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "0 0 10px 10px",
          backgroundColor: "rgba(255,255,255,0.95)",
        }}
      >
        <TextField
          fullWidth
          label="Search ingredients and molecules"
          variant="outlined"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        <Typography variant="h6" gutterBottom>
          {filteredIngredients.length} Results Found
        </Typography>

        <Grid container spacing={3}>
          {filteredIngredients.map((ingredient) => {
            const relatedFoods = foodsForIngredient(ingredient.id);

            return (
              <Grid item xs={12} sm={6} md={4} key={ingredient.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => navigate(`/ingredient/${ingredient.id}`)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <BiotechIcon sx={{ color: "#FF8C00", mr: 1 }} />
                      <Typography variant="h6" component="h2">
                        {ingredient.name}
                      </Typography>
                    </Box>

                    <HazardLevelIndicator
                      hazardLevel={ingredient.hazard_level}
                      size="small"
                    />

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      {ingredient.description ||
                        "Ingredient profile ready for source-backed details."}
                    </Typography>

                    <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Chip
                        size="small"
                        label={`${relatedFoods.length} linked food${
                          relatedFoods.length === 1 ? "" : "s"
                        }`}
                      />
                      <Chip size="small" label="PubMed evidence placeholder" />
                    </Box>
                  </CardContent>

                  <CardActions>
                    <Button size="small" startIcon={<VisibilityIcon />}>
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Container>
  );
};

export default IngredientList;
