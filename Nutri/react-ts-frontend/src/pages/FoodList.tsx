import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Autocomplete,
  Typography,
  Container,
  Paper,
  Checkbox,
  Grid,
  Chip,
  Card,
  CardContent,
  ListItemText,
  CardMedia,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Slider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Food, Ingredient } from "../interfaces";
import HazardLevelIndicator from "../components/HazardLevelIndicator";
import { getHazardColor, getHazardLabel } from "../utils/hazardUtils";

interface FoodListProps {
  accessToken: string | null;
  ingredients: Ingredient[];
  foods: Food[];
  selectedIngredients: number[];
  setSelectedIngredients: React.Dispatch<React.SetStateAction<number[]>>;
}

const dietaryOptions = [
  { value: "organic", label: "Organic" },
  { value: "gluten_free", label: "Gluten Free" },
  { value: "alcohol_free", label: "Alcohol Free" },
  { value: "lactose_free", label: "Lactose Free" },
  { value: "paleo", label: "Paleo" },
  { value: "keto", label: "Keto" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "whole_food", label: "Whole Food" },
  { value: "low_sugar", label: "Low Sugar" },
  { value: "low_sodium", label: "Low Sodium" },
  { value: "high_fiber", label: "High Fiber" },
];

const foodHasDietaryPreference = (food: Food, preference: string) => {
  if (food.dietary_preferences?.includes(preference)) return true;

  const legacyPreferenceMatches: Record<string, boolean> = {
    organic: food.is_organic,
    gluten_free: food.is_gluten_free,
    alcohol_free: food.is_alcohol_free,
    lactose_free: food.is_lactose_free,
  };

  return Boolean(legacyPreferenceMatches[preference]);
};

const hazardSliderGradient =
  "linear-gradient(90deg, #4CAF50 0%, #8BC34A 25%, #FFEB3B 50%, #F44336 75%, #9C27B0 100%)";

const FoodList: React.FC<FoodListProps> = ({
  accessToken,
  ingredients,
  foods,
  selectedIngredients,
  setSelectedIngredients,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const loaderRef = useRef<HTMLDivElement>(null); // Reference for infinite scroll detection

  // Add debounced search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedDietaryPreferences, setSelectedDietaryPreferences] = useState<string[]>([]);
  const [maxHazardLevel, setMaxHazardLevel] = useState(5);
  const selectedIngredientOptions = useMemo(
    () =>
      ingredients.filter((ingredient) =>
        selectedIngredients.includes(ingredient.id)
      ),
    [ingredients, selectedIngredients]
  );
  const selectedDietaryPreferenceOptions = useMemo(
    () =>
      dietaryOptions.filter((option) =>
        selectedDietaryPreferences.includes(option.value)
      ),
    [selectedDietaryPreferences]
  );

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(100);
  const [loading, setLoading] = useState(false);

  // Update this handler to navigate to the ViewFood component instead
  const handleFoodClick = (foodId: number) => {
    navigate(`/food/${foodId}`); // Change from '/approve-food/' to '/food/'
  };

  // Handler for search input change with debounce
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value); // Update the display value immediately for user feedback

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a new timeout to update the actual search term used for filtering
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, 300); // 300ms delay
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleIngredientChange = (_event: React.SyntheticEvent, value: Ingredient[]) => {
    setSelectedIngredients(value.map((ingredient) => ingredient.id));
  };

  const handleDietaryPreferenceChange = (
    _event: React.SyntheticEvent,
    value: typeof dietaryOptions
  ) => {
    setSelectedDietaryPreferences(value.map((option) => option.value));
  };

  // Add this new handler for chip clicks
  const handleTagClick = (filterName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    // Update the appropriate dietary filter
    setSelectedDietaryPreferences((prev) =>
      prev.includes(filterName) ? prev : [...prev, filterName]
    );

    // Scroll back to top to make it obvious to the user that a filter was applied
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Extract search query from URL parameters on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    // Handle search parameter
    const searchQuery = searchParams.get("search");
    if (searchQuery) {
      setSearchTerm(searchQuery);
      setDebouncedSearchTerm(searchQuery); // Also set debounced term immediately in this case
    }

  }, [location.search]);

  // Filter foods based on all criteria - now using debouncedSearchTerm
  const allFilteredFoods = useMemo(() => {
    return foods.filter((food) => {
      // Ingredient filter - food must contain at least one selected ingredient
      if (
        selectedIngredients.length > 0 &&
        !food.ingredients.some((id) => selectedIngredients.includes(id))
      ) {
        return false;
      }

      // Search term filter (case insensitive) - using debounced search term
      if (
        debouncedSearchTerm.trim() !== "" &&
        !food.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      ) {
        return false;
      }

      if ((food.hazard_level ?? 0) > maxHazardLevel) return false;

      if (
        selectedDietaryPreferences.length > 0 &&
        !selectedDietaryPreferences.every((preference) =>
          foodHasDietaryPreference(food, preference)
        )
      ) {
        return false;
      }

      return true;
    });
  }, [
    foods,
    selectedIngredients,
    debouncedSearchTerm, // Changed from searchTerm to debouncedSearchTerm
    maxHazardLevel,
    selectedDietaryPreferences,
  ]);

  // Visible foods - only show up to the current visibleCount
  const filteredFoods = useMemo(() => {
    return allFilteredFoods.slice(0, visibleCount);
  }, [allFilteredFoods, visibleCount]);

  // Load more foods when user scrolls to bottom
  const loadMoreFoods = useCallback(() => {
    if (loading) return;

    setLoading(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 100, allFilteredFoods.length));
      setLoading(false);
    }, 300); // Small delay to prevent too many updates
  }, [allFilteredFoods.length, loading]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(100);
  }, [
    debouncedSearchTerm,
    selectedIngredients,
    maxHazardLevel,
    selectedDietaryPreferences,
  ]); // Updated to use debouncedSearchTerm

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          filteredFoods.length < allFilteredFoods.length
        ) {
          loadMoreFoods();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [filteredFoods.length, allFilteredFoods.length, loadMoreFoods]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Page Header */}
      <Box
        sx={{
          backgroundColor: "#FF8C00",
          py: 3,
          px: 4,
          borderRadius: "10px 10px 0 0",
          mb: 0,
          color: "white",
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Food Explorer
        </Typography>
        <Typography variant="subtitle1">
          Discover foods that match your dietary preferences
        </Typography>
      </Box>

      {/* Filters Section */}
      <Box
        id="filter-section" // Add this id for scrolling functionality
        sx={{
          p: { xs: 2.5, md: 3 },
          backgroundColor: "rgba(255,255,255,0.96)",
          borderBottom: "1px solid #eaeaea",
        }}
      >
        <Grid container spacing={3}>
          {/* Search Box */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: "100%",
                borderRadius: 2,
                border: "1px solid #f0e0cd",
                background: "#fffaf4",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Search
              </Typography>
              <TextField
                fullWidth
                label="Search Foods"
                variant="outlined"
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Paper>
          </Grid>

          {/* Ingredient Filter */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: "100%",
                borderRadius: 2,
                border: "1px solid #f0e0cd",
                background: "#fffaf4",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Ingredients
              </Typography>
              <Autocomplete
                multiple
                disableCloseOnSelect
                options={ingredients}
                value={selectedIngredientOptions}
                onChange={handleIngredientChange}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderOption={(props, option, { selected }) => (
                  <Box component="li" {...props}>
                    <Checkbox checked={selected} sx={{ mr: 1 }} />
                    <ListItemText
                      primary={option.name}
                      secondary={option.description}
                    />
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Ingredients"
                    placeholder={
                      selectedIngredients.length === 0
                        ? "Type to search ingredients"
                        : ""
                    }
                  />
                )}
              />
              {selectedIngredients.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  All ingredients are included until you select one.
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: "100%",
                borderRadius: 2,
                border: "1px solid #f0e0cd",
                background: "#fffaf4",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1.5,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Max Hazard Level
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Show foods at or below this point
                  </Typography>
                </Box>
                <Chip
                  label={`${maxHazardLevel} · ${getHazardLabel(maxHazardLevel)}`}
                  sx={{
                    bgcolor: getHazardColor(maxHazardLevel),
                    color: maxHazardLevel === 2 ? "#333" : "#fff",
                    fontWeight: 700,
                  }}
                />
              </Box>
              <Slider
                value={maxHazardLevel}
                min={0}
                max={5}
                step={1}
                marks={[
                  { value: 0, label: "0" },
                  { value: 1, label: "1" },
                  { value: 2, label: "2" },
                  { value: 3, label: "3" },
                  { value: 4, label: "4" },
                  { value: 5, label: "5" },
                ]}
                valueLabelDisplay="auto"
                onChange={(_, value) =>
                  setMaxHazardLevel(Array.isArray(value) ? value[0] : value)
                }
                sx={{
                  width: "calc(100% - 32px)",
                  mx: 2,
                  pt: 2,
                  color: getHazardColor(maxHazardLevel),
                  "& .MuiSlider-rail": {
                    height: 8,
                    opacity: 1,
                    borderRadius: 999,
                    background: hazardSliderGradient,
                  },
                  "& .MuiSlider-track": {
                    height: 8,
                    border: 0,
                    borderRadius: 999,
                    background: hazardSliderGradient,
                  },
                  "& .MuiSlider-thumb": {
                    width: 24,
                    height: 24,
                    border: "3px solid #fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    backgroundColor: getHazardColor(maxHazardLevel),
                  },
                  "& .MuiSlider-mark": {
                    width: 2,
                    height: 8,
                    backgroundColor: "rgba(255,255,255,0.85)",
                  },
                  "& .MuiSlider-markLabel": {
                    fontSize: "0.75rem",
                    color: "text.secondary",
                  },
                  "& .MuiSlider-valueLabel": {
                    backgroundColor: getHazardColor(maxHazardLevel),
                    color: maxHazardLevel === 2 ? "#333" : "#fff",
                    fontWeight: 700,
                  },
                }}
              />
            </Paper>
          </Grid>

          {/* Dietary Preferences */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: "100%",
                borderRadius: 2,
                border: "1px solid #f0e0cd",
                background: "#fffaf4",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Dietary Preferences
              </Typography>
              <Autocomplete
                multiple
                disableCloseOnSelect
                options={dietaryOptions}
                value={selectedDietaryPreferenceOptions}
                onChange={handleDietaryPreferenceChange}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                renderOption={(props, option, { selected }) => (
                  <Box component="li" {...props}>
                    <Checkbox checked={selected} sx={{ mr: 1 }} />
                    <ListItemText primary={option.label} />
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Dietary Preferences"
                    placeholder={
                      selectedDietaryPreferences.length === 0
                        ? "Type to search preferences"
                        : ""
                    }
                  />
                )}
              />
              {selectedDietaryPreferences.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  All dietary preferences are included until you select one.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Results Section */}
      <Box
        sx={{
          p: 3,
          backgroundColor: "white",
          borderRadius: "0 0 10px 10px",
        }}
      >
        <Typography variant="h6" gutterBottom>
          {allFilteredFoods.length} Results Found
          {allFilteredFoods.length > filteredFoods.length &&
            ` (Showing ${filteredFoods.length})`}
        </Typography>

        <Grid container spacing={3}>
          {filteredFoods.map((food) => (
            <Grid item xs={12} sm={6} md={4} key={food.id}>
              {/* Make the entire card clickable by adding onClick */}
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s",
                  cursor: "pointer", // Add pointer cursor to indicate clickability
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
                onClick={() => handleFoodClick(food.id)}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={
                    food.image ||
                    "https://via.placeholder.com/300x140?text=No+Image"
                  }
                  alt={food.name}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {food.name}
                  </Typography>

                  {/* Add hazard level indicator below the name */}
                  <Box sx={{ mb: 2 }}>
                    <HazardLevelIndicator
                      hazardLevel={food.hazard_level}
                      size="small"
                      showLabel={false}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    {food.ingredients.length} linked ingredient
                    {food.ingredients.length === 1 ? "" : "s"}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    {food.is_organic && (
                      <Chip
                        label="Organic"
                        size="small"
                        color="success"
                        sx={{
                          mr: 0.5,
                          mb: 0.5,
                          cursor: "pointer",
                          "&:hover": { opacity: 0.8 },
                        }}
                        onClick={(e) => handleTagClick("organic", e)}
                      />
                    )}
                    {food.is_gluten_free && (
                      <Chip
                        label="Gluten Free"
                        size="small"
                        color="primary"
                        sx={{
                          mr: 0.5,
                          mb: 0.5,
                          cursor: "pointer",
                          "&:hover": { opacity: 0.8 },
                        }}
                        onClick={(e) => handleTagClick("gluten_free", e)}
                      />
                    )}
                    {food.is_lactose_free && (
                      <Chip
                        label="Lactose Free"
                        size="small"
                        color="primary"
                        sx={{
                          mr: 0.5,
                          mb: 0.5,
                          cursor: "pointer",
                          "&:hover": { opacity: 0.8 },
                        }}
                        onClick={(e) => handleTagClick("lactose_free", e)}
                      />
                    )}
                    {food.is_alcohol_free && (
                      <Chip
                        label="Alcohol Free"
                        size="small"
                        color="primary"
                        sx={{
                          mr: 0.5,
                          mb: 0.5,
                          cursor: "pointer",
                          "&:hover": { opacity: 0.8 },
                        }}
                        onClick={(e) => handleTagClick("alcohol_free", e)}
                      />
                    )}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent double navigation
                      handleFoodClick(food.id);
                    }}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}

          {/* Show message if no foods match the filters */}
          {allFilteredFoods.length === 0 && (
            <Box
              sx={{
                width: "100%",
                textAlign: "center",
                py: 8,
                px: 2,
              }}
            >
              <Typography variant="h6" color="text.secondary">
                No foods match your search criteria
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Try adjusting your filters or search term
              </Typography>
            </Box>
          )}
        </Grid>

        {/* Loading indicator at bottom for infinite scroll */}
        {filteredFoods.length < allFilteredFoods.length && (
          <Box
            ref={loaderRef}
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 4,
            }}
          >
            <CircularProgress size={30} />
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default FoodList;
