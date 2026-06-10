import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api, type MoleculeDetail } from "../lib/api";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "MoleculeDetail">;

function formatBoolean(value?: boolean): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unknown";
}

export default function MoleculeDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [molecule, setMolecule] = useState<MoleculeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api.molecule(id)
      .then((response) => {
        if (isMounted) setMolecule(response);
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load molecule");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!molecule) {
    return (
      <View style={styles.container}>
        <Text>No molecule data available.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {molecule.structure_image_url && (
        <Image
          source={{ uri: molecule.structure_image_url }}
          style={styles.structureImage}
          accessibilityLabel={`Molecular structure: ${molecule.name}`}
        />
      )}
      <Text style={styles.title}>{molecule.name}</Text>
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Harm</Text>
          <Text style={styles.scoreValue}>{molecule.harm_level ?? "?"}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Foods</Text>
          <Text style={styles.scoreValue}>{molecule.linked_food_count ?? molecule.foods.length}</Text>
        </View>
      </View>
      {!!molecule.molecular_formula && <Text style={styles.meta}>Formula: {molecule.molecular_formula}</Text>}
      {!!molecule.cas_number && <Text style={styles.meta}>CAS: {molecule.cas_number}</Text>}
      {molecule.pubchem_cid != null && <Text style={styles.meta}>PubChem CID: {molecule.pubchem_cid}</Text>}
      <Text style={styles.meta}>
        Heat stable: {formatBoolean(molecule.is_heat_stable)} · Neutralizable: {formatBoolean(molecule.is_neutralizable)}
      </Text>

      <Text style={styles.sectionTitle}>Harm mechanisms</Text>
      {!!molecule.harm_mechanisms?.length ? molecule.harm_mechanisms.map((mechanism) => (
        <Text key={mechanism} style={styles.bullet}>- {mechanism}</Text>
      )) : (
        <Text style={styles.meta}>No harm mechanisms listed.</Text>
      )}

      <Text style={styles.sectionTitle}>Linked foods</Text>
      {molecule.foods.length > 0 ? molecule.foods.map((food) => (
        <Pressable
          key={food.id}
          style={styles.foodItem}
          onPress={() => navigation.navigate("FoodDetail", { id: food.id })}
        >
          <Text style={styles.foodName}>{food.name}</Text>
          <Text style={styles.meta}>
            {food.category ?? "Uncategorized"}
            {food.amount_per_100g ? ` · ${food.amount_per_100g} ${food.unit || ""}` : ""}
            {food.is_beneficial ? " · beneficial" : ""}
          </Text>
        </Pressable>
      )) : (
        <Text style={styles.meta}>No linked foods available.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  structureImage: { width: "100%", height: 180, borderRadius: 8, marginBottom: 16, resizeMode: "contain", backgroundColor: "#f8fafc" },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 16, textTransform: "capitalize" },
  scoreRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  scoreBox: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 14, backgroundColor: "#fff" },
  scoreLabel: { color: "#64748b", fontWeight: "700" },
  scoreValue: { marginTop: 4, fontSize: 28, fontWeight: "800", color: "#0f172a" },
  sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 18, fontWeight: "800" },
  bullet: { color: "#334155", lineHeight: 22, marginBottom: 4 },
  foodItem: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginBottom: 10, backgroundColor: "#fff" },
  foodName: { fontSize: 16, fontWeight: "800", color: "#0f172a", textTransform: "capitalize" },
  meta: { color: "#64748b", marginTop: 4 },
  error: { color: "#b91c1c", fontWeight: "700" },
});
