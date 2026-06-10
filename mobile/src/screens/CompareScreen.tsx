import { useState } from "react";
import { ActivityIndicator, Button, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api, type CompareResponse, type FoodListItem } from "../lib/api";
import { asArray, firstItems } from "../lib/array";
import { formatCount, moleculeAmountEntries, sharedMoleculeNames } from "../lib/compareDisplay";
import { formatScore } from "../lib/scoreDisplay";
import { formatOptionalText } from "../lib/textDisplay";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Compare">;

const MAX_SEARCH_QUERY_CHARS = 128;

function searchQueryLength(value: string) {
  return Array.from(value).length;
}

function displayCategory(food: FoodListItem): string | null {
  return formatOptionalText(food.category_name) ?? formatOptionalText(food.category);
}

export default function CompareScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodListItem[]>([]);
  const [selected, setSelected] = useState<FoodListItem[]>([]);
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const comparisonFoods = comparison ? asArray(comparison.foods) : [];
  const sharedMolecules = comparison ? sharedMoleculeNames(comparison.shared_molecules) : [];

  const runSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (searchQueryLength(trimmed) > MAX_SEARCH_QUERY_CHARS) {
      setResults([]);
      setError(`Search queries are limited to ${MAX_SEARCH_QUERY_CHARS} characters.`);
      return;
    }
    setIsSearching(true);
    setError(null);
    api.search(trimmed)
      .then((response) => setResults(firstItems(response.foods, 8)))
      .catch((err) => setError(err instanceof Error ? err.message : "Search failed"))
      .finally(() => setIsSearching(false));
  };

  const addFood = (food: FoodListItem) => {
    if (selected.some((item) => item.id === food.id) || selected.length >= 3) return;
    setSelected((items) => [...items, food]);
    setComparison(null);
  };

  const removeFood = (id: string) => {
    setSelected((items) => items.filter((item) => item.id !== id));
    setComparison(null);
  };

  const runCompare = () => {
    if (selected.length < 2) {
      setError("Compare requires 2-3 foods.");
      return;
    }
    setIsComparing(true);
    setError(null);
    api.compare(selected.map((food) => food.id))
      .then(setComparison)
      .catch((err) => setError(err instanceof Error ? err.message : "Compare failed"))
      .finally(() => setIsComparing(false));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Compare foods</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods to compare"
          autoCapitalize="none"
          maxLength={MAX_SEARCH_QUERY_CHARS}
          returnKeyType="search"
          onSubmitEditing={runSearch}
          style={styles.input}
        />
        <Button title="Search" onPress={runSearch} />
      </View>
      {isSearching && <ActivityIndicator style={styles.loader} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {selected.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected ({selected.length}/3)</Text>
          {selected.map((food) => (
            <Pressable key={food.id} style={styles.selectedItem} onPress={() => removeFood(food.id)}>
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ))}
          <Button title={isComparing ? "Comparing..." : "Compare selected"} onPress={runCompare} disabled={isComparing || selected.length < 2} />
        </View>
      )}

      {results.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search results</Text>
          {results.map((food) => {
            const category = displayCategory(food);

            return (
              <Pressable key={food.id} style={styles.resultItem} onPress={() => addFood(food)}>
                <View style={styles.resultContent}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.meta}>
                    Health {formatScore(food.health_index, "?")}
                    {category ? ` · ${category}` : ""}
                  </Text>
                </View>
                <Text style={styles.addText}>{selected.some((item) => item.id === food.id) ? "Added" : "Add"}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {comparison && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comparison</Text>
          {comparisonFoods.map((food) => {
            const moleculeEntries = moleculeAmountEntries(food.molecules);

            return (
              <Pressable
                key={food.id}
                style={styles.compareCard}
                onPress={() => navigation.navigate("FoodDetail", { id: food.id })}
              >
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.meta}>Health {formatScore(food.health_index)} · Safety {formatScore(food.safety_score)}</Text>
                <Text style={styles.meta}>Molecules: {formatCount(moleculeEntries.length)}</Text>
              </Pressable>
            );
          })}
          <Text style={styles.meta}>Shared molecules: {sharedMolecules.length ? sharedMolecules.join(", ") : "None"}</Text>
          <Text style={styles.meta}>Unique molecules: {formatCount(comparison.total_unique_molecules)}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 14 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff" },
  loader: { marginTop: 16 },
  section: { marginTop: 18, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  resultItem: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, backgroundColor: "#fff" },
  selectedItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 8, padding: 12, backgroundColor: "#f0fdf4" },
  compareCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, backgroundColor: "#fff" },
  resultContent: { flex: 1, minWidth: 0 },
  foodName: { fontSize: 16, fontWeight: "800", color: "#0f172a", textTransform: "capitalize" },
  addText: { color: "#047857", fontWeight: "800" },
  removeText: { color: "#b91c1c", fontWeight: "800" },
  meta: { color: "#64748b", marginTop: 4 },
  error: { color: "#b91c1c", marginTop: 12, fontWeight: "700" },
});
