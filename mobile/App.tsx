import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import FoodDetailScreen from "./src/screens/FoodDetailScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ScanScreen from "./src/screens/ScanScreen";
import SearchScreen from "./src/screens/SearchScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "nutrii" }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Search" }} />
        <Stack.Screen name="FoodDetail" component={FoodDetailScreen} options={{ title: "Ingredient" }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "Scan Label" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
