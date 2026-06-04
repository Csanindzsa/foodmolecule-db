import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Container,
  CircularProgress,
  Grid,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Slider,
  TextField,
  Typography,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import BiotechIcon from "@mui/icons-material/Biotech";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Food, Ingredient } from "../interfaces";
import HazardLevelIndicator from "../components/HazardLevelIndicator";
import { getHazardColor, getHazardLabel } from "../utils/hazardUtils";

interface IngredientListProps {
  ingredients: Ingredient[];
  foods: Food[];
}

const hazardSliderGradient =
  "linear-gradient(90deg, #4CAF50 0%, #8BC34A 25%, #FFEB3B 50%, #F44336 75%, #9C27B0 100%)";

const ingredientSortOptions = [
  { value: "name_asc", label: "Name: A-Z" },
  { value: "name_desc", label: "Name: Z-A" },
  { value: "links_desc", label: "Most linked foods" },
  { value: "links_asc", label: "Fewest linked foods" },
  { value: "safety_desc", label: "Safety: safest first" },
  { value: "safety_asc", label: "Safety: riskiest first" },
];

const IngredientList: React.FC<IngredientListProps> = ({ ingredients, foods }) => {
  const navigate = useNavigate();
  const loaderRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [maxHazardLevel, setMaxHazardLevel] = useState(5);
  const [sortBy, setSortBy] = useState("name_asc");
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  const [visibleCount, setVisibleCount] = useState(48);
  const [isPending, startTransition] = useTransition();
  const activeSortLabel =
    ingredientSortOptions.find((option) => option.value === sortBy)?.label ??
    "Name: A-Z";

  const foodCountByIngredient = useMemo(() => {
    const counts = new Map<string, number>();

    foods.forEach((food) => {
      food.ingredients.forEach((ingredientId) => {
        const key = String(ingredientId);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });

    return counts;
  }, [foods]);

  const linkedFoodCount = useCallback(
    (ingredient: Ingredient) =>
      ingredient.linked_food_count ?? foodCountByIngredient.get(String(ingredient.id)) ?? 0,
    [foodCountByIngredient],
  );

  const filteredIngredients = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();

    return ingredients
      .filter((ingredient) =>
        ingredient.hazard_level <= maxHazardLevel &&
        (!query ||
          [ingredient.name, ingredient.description || ""].some((value) =>
            value.toLowerCase().includes(query)
          ))
      )
      .sort((a, b) => {
        switch (sortBy) {
          case "name_desc":
            return b.name.localeCompare(a.name);
          case "links_desc":
            return linkedFoodCount(b) - linkedFoodCount(a) || a.name.localeCompare(b.name);
          case "links_asc":
            return linkedFoodCount(a) - linkedFoodCount(b) || a.name.localeCompare(b.name);
          case "safety_desc":
            return a.hazard_level - b.hazard_level || a.name.localeCompare(b.name);
          case "safety_asc":
            return b.hazard_level - a.hazard_level || a.name.localeCompare(b.name);
          case "name_asc":
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [deferredSearchTerm, ingredients, linkedFoodCount, maxHazardLevel, sortBy]);

  const visibleIngredients = useMemo(
    () => filteredIngredients.slice(0, visibleCount),
    [filteredIngredients, visibleCount],
  );

  useEffect(() => {
    setVisibleCount(48);
  }, [deferredSearchTerm, maxHazardLevel, sortBy]);

  const loadMoreIngredients = useCallback(() => {
    setVisibleCount((current) =>
      Math.min(current + 48, filteredIngredients.length),
    );
  }, [filteredIngredients.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          visibleCount < filteredIngredients.length
        ) {
          loadMoreIngredients();
        }
      },
      { threshold: 0.1 },
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [filteredIngredients.length, loadMoreIngredients, visibleCount]);

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
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
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
                label="Search Ingredients"
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
              />
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
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Sort
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SortIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={(event) => setSortMenuAnchor(event.currentTarget)}
                sx={{ justifyContent: "space-between", textTransform: "none" }}
              >
                {activeSortLabel}
              </Button>
              <Menu
                anchorEl={sortMenuAnchor}
                open={Boolean(sortMenuAnchor)}
                onClose={() => setSortMenuAnchor(null)}
                disableScrollLock
              >
                {ingredientSortOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    selected={option.value === sortBy}
                    onClick={() => {
                      startTransition(() => {
                        setSortBy(option.value);
                      });
                      setSortMenuAnchor(null);
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Menu>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
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
                  gap: 2,
                  mb: 1.5,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Max Hazard Level
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Show ingredients at or below this point
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

        <Typography variant="h6" gutterBottom>
          {filteredIngredients.length} Results Found
          {filteredIngredients.length > visibleIngredients.length &&
            ` (Showing ${visibleIngredients.length})`}
        </Typography>
        {isPending && <LinearProgress sx={{ mb: 2 }} />}

        <Grid container spacing={3}>
          {visibleIngredients.map((ingredient) => {
            const linkedCount = linkedFoodCount(ingredient);

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
                        label={`${linkedCount} linked food${
                          linkedCount === 1 ? "" : "s"
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

        {visibleCount < filteredIngredients.length && (
          <Box
            ref={loaderRef}
            sx={{ display: "flex", justifyContent: "center", py: 4 }}
          >
            <CircularProgress size={30} />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default IngredientList;
