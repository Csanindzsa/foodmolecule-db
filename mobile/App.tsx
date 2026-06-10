import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import BanListScreen from "./src/screens/BanListScreen";
import CompareScreen from "./src/screens/CompareScreen";
import FoodDetailScreen from "./src/screens/FoodDetailScreen";
import HomeScreen from "./src/screens/HomeScreen";
import MoleculeDetailScreen from "./src/screens/MoleculeDetailScreen";
import ResearchScreen from "./src/screens/ResearchScreen";
import ScanScreen from "./src/screens/ScanScreen";
import SearchScreen from "./src/screens/SearchScreen";
import type { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "nutrii" }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Search" }} />
        <Stack.Screen name="Compare" component={CompareScreen} options={{ title: "Compare" }} />
        <Stack.Screen name="Research" component={ResearchScreen} options={{ title: "Research" }} />
        <Stack.Screen name="FoodDetail" component={FoodDetailScreen} options={{ title: "Ingredient" }} />
        <Stack.Screen name="MoleculeDetail" component={MoleculeDetailScreen} options={{ title: "Molecule" }} />
        <Stack.Screen name="BanList" component={BanListScreen} options={{ title: "Ban List" }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "Scan Label" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
