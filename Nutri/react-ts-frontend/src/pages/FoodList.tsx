import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useDeferredValue,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createFilterOptions } from "@mui/material/Autocomplete";
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
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  CircularProgress,
  LinearProgress,
  Slider,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { EntityId, Food, Ingredient } from "../interfaces";
import HazardLevelIndicator from "../components/HazardLevelIndicator";
import { getHazardColor, getHazardLabel } from "../utils/hazardUtils";
import { loadFoodPage } from "../utils/backendAdapters";

interface FoodListProps {
  accessToken: string | null;
  ingredients: Ingredient[];
  foods: Food[];
  selectedIngredients: EntityId[];
  setSelectedIngredients: React.Dispatch<React.SetStateAction<EntityId[]>>;
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

const foodSortOptions = [
  { value: "safety_desc", label: "Safety: highest first" },
  { value: "safety_asc", label: "Safety: lowest first" },
  { value: "name_asc", label: "Name: A-Z" },
  { value: "name_desc", label: "Name: Z-A" },
  { value: "links_desc", label: "Most linked ingredients" },
  { value: "links_asc", label: "Fewest linked ingredients" },
  { value: "hazard_asc", label: "Hazard: low to high" },
  { value: "hazard_desc", label: "Hazard: high to low" },
];

const hazardSliderGradient =
  "linear-gradient(90deg, #4CAF50 0%, #8BC34A 25%, #FFEB3B 50%, #F44336 75%, #9C27B0 100%)";

const filterPanelSx = {
  p: 2,
  height: "100%",
  borderRadius: 2,
  border: "1px solid #f0e0cd",
  background: "#fffaf4",
};

const ingredientFilterOptions = createFilterOptions<Ingredient>({
  limit: 60,
  stringify: (option) => `${option.name} ${option.description ?? ""}`,
});

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
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Add debounced search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(debouncedSearchTerm);
  const normalizedSearchTerm = useMemo(
    () => deferredSearchTerm.trim().toLowerCase(),
    [deferredSearchTerm]
  );
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedDietaryPreferences, setSelectedDietaryPreferences] = useState<string[]>([]);
  const [maxHazardLevel, setMaxHazardLevel] = useState(5);
  const [sortBy, setSortBy] = useState("safety_desc");
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const activeSortLabel =
    foodSortOptions.find((option) => option.value === sortBy)?.label ??
    "Safety: highest first";
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

  const [foodResults, setFoodResults] = useState<Food[]>(foods);
  const [totalCount, setTotalCount] = useState(foods.length);
  const [nextPage, setNextPage] = useState<number | null>(2);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Update this handler to navigate to the ViewFood component instead
  const handleFoodClick = (foodId: EntityId) => {
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

  const loadFoods = useCallback(
    async (page: number, append = false) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (!append) {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setInitialLoading(true);
        setNextPage(null);
      } else {
        setLoadingMore(true);
      }

      setLoadError(null);

      try {
        const pageData = await loadFoodPage(
          {
            page,
            pageSize: 50,
            q: normalizedSearchTerm,
            sort: sortBy,
            maxHazardLevel,
            ingredients: selectedIngredients,
            dietaryPreferences: selectedDietaryPreferences,
          },
          append ? undefined : abortRef.current?.signal,
        );

        if (requestId !== requestIdRef.current) return;

        setTotalCount(pageData.count);
        setNextPage(pageData.next ? page + 1 : null);
        setFoodResults((current) => {
          if (!append) return pageData.results;

          const existingIds = new Set(current.map((food) => String(food.id)));
          const newFoods = pageData.results.filter(
            (food) => !existingIds.has(String(food.id)),
          );
          return [...current, ...newFoods];
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error loading foods:", error);
        setLoadError("Could not load foods. Check the backend connection and try again.");
      } finally {
        if (requestId === requestIdRef.current) {
          setInitialLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [
      maxHazardLevel,
      normalizedSearchTerm,
      selectedDietaryPreferences,
      selectedIngredients,
      sortBy,
    ],
  );

  useEffect(() => {
    loadFoods(1, false);

    return () => {
      abortRef.current?.abort();
    };
  }, [loadFoods]);

  const loadMoreFoods = useCallback(() => {
    if (!nextPage || loadingMore || initialLoading) return;
    loadFoods(nextPage, true);
  }, [initialLoading, loadFoods, loadingMore, nextPage]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          nextPage &&
          !loadingMore &&
          !initialLoading
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
  }, [initialLoading, loadingMore, loadMoreFoods, nextPage]);

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
        <Grid container spacing={3} alignItems="stretch">
          {/* Search Box */}
          <Grid item xs={12} md={8}>
            <Paper
              elevation={0}
              sx={filterPanelSx}
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

          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={filterPanelSx}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Sort
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SortIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={(event) => setSortMenuAnchor(event.currentTarget)}
                sx={{
                  justifyContent: "space-between",
                  minHeight: 56,
                  textTransform: "none",
                }}
              >
                {activeSortLabel}
              </Button>
              <Menu
                anchorEl={sortMenuAnchor}
                open={Boolean(sortMenuAnchor)}
                onClose={() => setSortMenuAnchor(null)}
                disableScrollLock
              >
                {foodSortOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    selected={option.value === sortBy}
                    onClick={() => {
                      setSortBy(option.value);
                      setSortMenuAnchor(null);
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Menu>
            </Paper>
          </Grid>

          {/* Ingredient Filter */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={filterPanelSx}
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
                filterOptions={ingredientFilterOptions}
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
              sx={filterPanelSx}
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

          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={filterPanelSx}
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
        {initialLoading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Loading matching foods
            </Typography>
          </Box>
        )}

        {loadError && (
          <Typography color="error" sx={{ mb: 2 }}>
            {loadError}
          </Typography>
        )}

        <Typography variant="h6" gutterBottom>
          {totalCount} Results Found
          {totalCount > foodResults.length && ` (Showing ${foodResults.length})`}
        </Typography>

        <Grid container spacing={3}>
          {foodResults.map((food) => (
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
          {!initialLoading && foodResults.length === 0 && (
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
        {nextPage && (
          <Box
            ref={loaderRef}
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 4,
            }}
          >
            {loadingMore && <CircularProgress size={30} />}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default FoodList;
