import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Autocomplete,
  Typography,
  TextField,
  InputAdornment,
  Container,
  Card,
  CardMedia,
  CardContent,
  Paper,
  Grid,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { EntityId, Food, Ingredient, Restaurant } from "../interfaces";
import { red } from "@mui/material/colors";
import { getRestaurantImage } from "../utils/imageUtils";

interface WelcomeSectionProps {
  restaurants: Restaurant[];
  foods: Food[];
  ingredients: Ingredient[];
}

type SearchSuggestion = {
  id: EntityId;
  label: string;
  type: "Food" | "Ingredient";
  description?: string | null;
};

const CarrotOutline = ({
  sx,
}: {
  sx: Record<string, string | number | object>;
}) => (
  <Box
    component="svg"
    viewBox="0 0 120 170"
    aria-hidden="true"
    sx={{
      position: "absolute",
      width: 72,
      height: 102,
      fill: "none",
      stroke: "#ffffff",
      strokeWidth: 7,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      opacity: 0.32,
      pointerEvents: "none",
      ...sx,
    }}
  >
    <path d="M60 48 C34 48 23 62 27 88 C31 113 45 143 60 160 C75 143 89 113 93 88 C97 62 86 48 60 48 Z" />
    <path d="M60 47 C44 28 41 12 52 6 C63 0 70 19 60 47 Z" />
    <path d="M60 47 C65 23 79 10 91 18 C103 26 88 44 60 47 Z" />
    <path d="M60 47 C51 25 34 15 23 25 C13 35 33 48 60 47 Z" />
    <path d="M34 80 L57 74" />
    <path d="M86 101 L62 96" />
    <path d="M42 123 L65 116" />
  </Box>
);

const CarrotPattern = () => (
  <Box
    aria-hidden="true"
    sx={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      zIndex: 0,
      pointerEvents: "none",
    }}
  >
    <CarrotOutline sx={{ top: 34, left: "8%", transform: "rotate(-16deg)" }} />
    <CarrotOutline
      sx={{
        top: 92,
        left: "20%",
        width: 54,
        height: 76,
        transform: "rotate(18deg)",
        opacity: 0.26,
      }}
    />
    <CarrotOutline
      sx={{
        top: 26,
        right: "12%",
        width: 68,
        height: 96,
        transform: "rotate(14deg)",
      }}
    />
    <CarrotOutline
      sx={{
        top: 176,
        right: "22%",
        width: 50,
        height: 70,
        transform: "rotate(-26deg)",
        opacity: 0.24,
      }}
    />
    <CarrotOutline
      sx={{
        bottom: 28,
        left: "10%",
        width: 46,
        height: 65,
        transform: "rotate(32deg)",
        opacity: 0.24,
      }}
    />
    <CarrotOutline
      sx={{
        bottom: 58,
        right: "6%",
        transform: "rotate(-18deg)",
        opacity: 0.28,
      }}
    />
  </Box>
);

const searchPlaceholderTargets = ["foods", "ingredients"];

const WelcomeSection: React.FC<WelcomeSectionProps> = ({
  restaurants,
  foods,
  ingredients,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typedSearchTarget, setTypedSearchTarget] = useState(
    searchPlaceholderTargets[0],
  );
  const [searchTargetIndex, setSearchTargetIndex] = useState(0);
  const [isDeletingSearchTarget, setIsDeletingSearchTarget] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const searchSuggestions = useMemo<SearchSuggestion[]>(
    () => [
      ...foods.map((food) => ({
        id: food.id,
        label: food.name,
        type: "Food" as const,
        description: food.restaurant_name,
      })),
      ...ingredients.map((ingredient) => ({
        id: ingredient.id,
        label: ingredient.name,
        type: "Ingredient" as const,
        description: ingredient.description,
      })),
    ],
    [foods, ingredients],
  );

  useEffect(() => {
    const currentTarget = searchPlaceholderTargets[searchTargetIndex];
    let delay = isDeletingSearchTarget ? 45 : 75;

    if (!isDeletingSearchTarget && typedSearchTarget === currentTarget) {
      delay = 1500;
    }

    if (isDeletingSearchTarget && typedSearchTarget === "") {
      delay = 260;
    }

    const timeout = window.setTimeout(() => {
      if (!isDeletingSearchTarget && typedSearchTarget === currentTarget) {
        setIsDeletingSearchTarget(true);
        return;
      }

      if (isDeletingSearchTarget && typedSearchTarget === "") {
        setIsDeletingSearchTarget(false);
        setSearchTargetIndex(
          (currentIndex) =>
            (currentIndex + 1) % searchPlaceholderTargets.length,
        );
        return;
      }

      setTypedSearchTarget((currentText) =>
        isDeletingSearchTarget
          ? currentText.slice(0, -1)
          : currentTarget.slice(0, currentText.length + 1),
      );
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [isDeletingSearchTarget, searchTargetIndex, typedSearchTarget]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to foods page with search query as URL parameter
    if (searchTerm.trim()) {
      navigate(`/foods?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate("/foods");
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion | null) => {
    if (!suggestion) return;

    setSearchTerm(suggestion.label);
    navigate(
      suggestion.type === "Food"
        ? `/food/${suggestion.id}`
        : `/ingredient/${suggestion.id}`,
    );
  };

  // Temporary preview cards use the legacy restaurant-shaped data until backend wiring lands.
  const handlePreviewClick = (previewId: EntityId) => {
    navigate(`/food/${previewId}`);
  };

  return (
    <Box sx={{ width: "100%", position: "relative", overflow: "visible" }}>
      {/* Orange Background Section */}
      <Box
        sx={{
          backgroundColor: "#FF8C00",
          width: "100%",
          position: "relative",
          pt: 10, // Increased top padding to move welcome section lower
          pb: 16,
          zIndex: 1,
        }}
      >
        <CarrotPattern />
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4, lg: 5 } }}>
          {/* Welcome Header */}
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 700,
                color: "#ffffff",
                textShadow: "1px 1px 3px rgba(0,0,0,0.2)",
                mb: 1,
              }}
            >
              Welcome to Nutrii
            </Typography>

            <Typography
              variant="h5"
              sx={{
                color: "rgba(255,255,255,0.9)",
                fontWeight: 400,
              }}
            >
              your dietary aid
            </Typography>
          </Box>

          {/* Search Bar */}
          <Paper
            component="form"
            onSubmit={handleSearch}
	            elevation={3}
	            sx={{
	              p: "0 4px",
	              display: "flex",
	              alignItems: "center",
	              minHeight: 64,
	              width: "90%",
              maxWidth: "800px",
              mx: "auto",
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.95)",
              position: "relative",
              zIndex: 2,
              mb: 4, // Added margin bottom to the search bar itself for additional spacing
            }}
          >
            <InputAdornment position="start" sx={{ pl: 2 }}>
              <SearchIcon color="action" />
            </InputAdornment>
            {!searchTerm && (
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  left: 58,
                  right: 20,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                  color: "#777",
                  fontSize: "1.1rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <Box component="span">Find&nbsp;</Box>
                <Box
                  component="span"
                  sx={{
                    color: "#FF8C00",
                    fontWeight: 600,
                  }}
                >
                  {typedSearchTarget}
                </Box>
                <Box
                  component="span"
                  sx={{
                    ml: 0.25,
                    width: "0.55em",
                    color: "#FF8C00",
                    animation: "searchCursorBlink 1s step-end infinite",
                    "@keyframes searchCursorBlink": {
                      "0%, 45%": { opacity: 1 },
                      "46%, 100%": { opacity: 0 },
                    },
                  }}
                >
                  _
                </Box>
              </Box>
            )}
            <Autocomplete
              fullWidth
              clearOnBlur={false}
              forcePopupIcon={false}
              open={searchTerm.trim().length > 0}
              options={searchSuggestions}
              inputValue={searchTerm}
              onInputChange={(_, value) => setSearchTerm(value)}
              onChange={(_, value) => handleSuggestionSelect(value)}
              filterOptions={(options, state) => {
                const query = state.inputValue.trim().toLowerCase();
                if (!query) return [];

                return options
                  .filter((option) =>
                    [option.label, option.description || "", option.type].some(
                      (value) => value.toLowerCase().includes(query),
                    ),
                  )
                  .slice(0, 8);
              }}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) =>
                option.type === value.type && option.id === value.id
              }
              renderOption={(props, option) => (
                <Box
                  component="li"
                  {...props}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {option.label}
                    </Typography>
                    {option.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ display: "block", maxWidth: 360 }}
                      >
                        {option.description}
                      </Typography>
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 999,
                      bgcolor:
                        option.type === "Food"
                          ? "rgba(255,140,0,0.14)"
                          : "rgba(76,175,80,0.14)",
                      color: option.type === "Food" ? "#c46600" : "#2e7d32",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {option.type}
                  </Typography>
                </Box>
              )}
              noOptionsText={
                searchTerm.trim() ? "No matching foods or ingredients" : ""
              }
	              sx={{
	                ml: 1,
	                flex: 1,
	                height: "100%",
	                "& .MuiInputBase-root": {
	                  minHeight: 64,
	                  alignItems: "center",
	                },
	                "& .MuiAutocomplete-endAdornment": {
	                  display: "none",
	                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  InputProps={{
                    ...params.InputProps,
                    disableUnderline: true,
                  }}
                  inputProps={{
                    ...params.inputProps,
                    "aria-label": "Search foods and ingredients",
	                  }}
		                  sx={{
		                    "& .MuiInputBase-input": {
                      py: 0,
                      fontSize: "1.1rem",
                    },
                  }}
                />
              )}
            />
          </Paper>
        </Container>
      </Box>

      {/* Wave SVG with the discovery cue overlaid on it */}
      <Box
        sx={{
          position: "relative",
          height: "80px",
          marginTop: "0px",
        }}
      >
        {/* The Wave SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 2,
            transform: "rotate(180deg)",
          }}
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            fill="#FF8C00"
          ></path>
        </svg>

        {/* Discovery section positioned on top of the wave */}
        <Box
          sx={{
            position: "absolute",
            top: "0%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            zIndex: 3, // Above the wave
          }}
        >
          <KeyboardArrowDownIcon
            sx={{
              fontSize: 40,
              color: "#ffffff",
              animation: "bounce 2s infinite",
              filter: "drop-shadow(0px 2px 3px rgba(0,0,0,0.2))",
              "@keyframes bounce": {
                "0%, 20%, 50%, 80%, 100%": {
                  transform: "translateY(0)",
                },
                "40%": {
                  transform: "translateY(-10px)",
                },
                "60%": {
                  transform: "translateY(-5px)",
                },
              },
            }}
          />
          <Typography
            variant="h5"
            sx={{
              mt: 1,
              color: "#ffffff",
              fontWeight: 500,
              textAlign: "center",
              textShadow: "0px 2px 3px rgba(0,0,0,0.2)", // Added shadow for better visibility
            }}
          >
            Discover foods
          </Typography>
        </Box>
      </Box>

      {/* Space to ensure proper layout after the wave */}
      <Box sx={{ height: "40px" }} />

      {/* Preview list with plenty of space after the wave */}
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 5, mt: 4 }}>
        <Box sx={{ mb: 10, color: "orange" }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              mb: 3,
              fontWeight: 600,
            }}
          >
            Featured foods/ingredients and molecules
          </Typography>
          <Grid container spacing={3}>
            {restaurants.slice(0, 4).map((restaurant) => (
              <Grid item xs={12} sm={6} md={3} key={restaurant.id}>
                <Card
                  sx={{
                    height: "100%",
                    cursor: "pointer", // Add pointer cursor to indicate clickability
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "scale(1.03)",
                    },
                  }}
                  onClick={() => handlePreviewClick(restaurant.id)}
                >
                  <CardMedia
                    component="img"
                    height="140"
                    image={getRestaurantImage(
                      restaurant.image,
                      restaurant.imageIsLocal,
                    )}
                    alt={restaurant.name}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h6" component="div">
                      {restaurant.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {restaurant.cuisine || "Various cuisines"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          {restaurants.length > 4 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => navigate("/foods")}
                sx={{
                  backgroundColor: "#FF8C00",
                  color: "#ffffff",
                  "&:hover": {
                    backgroundColor: "#e67e00",
                  },
                  fontWeight: 500,
                  px: 4,
                }}
              >
                View All Foods
              </Button>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default WelcomeSection;
