import { Button, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Scan: undefined;
  FoodDetail: { id: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>nutrii</Text>
      <Text style={styles.subtitle}>Know what you eat</Text>
      <View style={styles.buttonRow}>
        <Button title="Search" onPress={() => navigation.navigate("Search")} />
        <Button title="Scan Label" onPress={() => navigation.navigate("Scan")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 48, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 18, color: "#666", marginBottom: 24 },
  buttonRow: { flexDirection: "row", gap: 16 },
});
