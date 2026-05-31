import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { EntityId, Restaurant, Food, Ingredient } from "../interfaces";
import WelcomeSection from "../components/WelcomeSection";
import { Box } from "@mui/material"; // Remove Container import

// Fix interface to match all possible props
interface MainPageProps {
  restaurants: Restaurant[];
  ingredients: Ingredient[];
  foods: Food[];
  selectedRestaurants: EntityId[];
  setSelectedRestaurants: React.Dispatch<React.SetStateAction<EntityId[]>>;
  selectedIngredients: EntityId[];
  setSelectedIngredients: React.Dispatch<React.SetStateAction<EntityId[]>>;
  // Optional props with defaults
  accessToken?: string | null;
  setRestaurants?: React.Dispatch<React.SetStateAction<Restaurant[]>>;
  setIngredients?: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  setFoods?: React.Dispatch<React.SetStateAction<Food[]>>;
}

const MainPage: React.FC<MainPageProps> = ({
  restaurants,
  ingredients,
  foods,
  selectedRestaurants,
  setSelectedRestaurants,
  selectedIngredients,
  setSelectedIngredients,
  // Optional props with defaults
  accessToken,
  setRestaurants = () => {},
  setIngredients = () => {},
  setFoods = () => {},
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Clean up URL parameters if needed
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("success")) {
      navigate("/", { replace: true });
    }
  }, [location, navigate]);

  return (
    // Remove the Container component to allow full width
    <Box sx={{ width: "100%" }}>
      {/* WelcomeSection will now have full width */}
      <WelcomeSection
        restaurants={restaurants || []}
        foods={foods || []}
        ingredients={ingredients || []}
      />
    </Box>
  );
};

export default MainPage;
