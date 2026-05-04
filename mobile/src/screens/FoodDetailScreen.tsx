import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type RootStackParamList = {
  FoodDetail: { id: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "FoodDetail">;

export default function FoodDetailScreen({ route }: Props) {
  const { id } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Food ID: {id}</Text>
      <Text>Full detail view coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
});
