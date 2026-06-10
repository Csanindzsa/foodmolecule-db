import { useState } from "react";
import { ActivityIndicator, Button, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api, type FoodListItem, type Molecule } from "../lib/api";
import { formatScore } from "../lib/scoreDisplay";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Search">;

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [foodResults, setFoodResults] = useState<FoodListItem[]>([]);
  const [moleculeResults, setMoleculeResults] = useState<Molecule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const hasResults = foodResults.length > 0 || moleculeResults.length > 0;

  async function handleSearch() {
    const trimmed = query.trim();
    setHasSearched(true);
    setError(null);
    if (!trimmed) {
      setFoodResults([]);
      setMoleculeResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.search(trimmed);
      setFoodResults(response.foods);
      setMoleculeResults(response.molecules);
    } catch (err) {
      setFoodResults([]);
      setMoleculeResults([]);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search ingredient..."
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={handleSearch}
      />
      <Button title="Search" onPress={handleSearch} />
      {isLoading && <ActivityIndicator style={styles.status} />}
      {error && <Text style={[styles.status, styles.error]}>{error}</Text>}
      {!isLoading && !error && hasSearched && !hasResults && (
        <Text style={styles.status}>No matching foods or molecules found.</Text>
      )}
      <ScrollView contentContainerStyle={styles.results}>
        {foodResults.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Foods</Text>
            {foodResults.map((item) => (
              <Pressable key={item.id} style={styles.resultItem} onPress={() => navigation.navigate("FoodDetail", { id: item.id })}>
                {item.image_url && (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.resultImage}
                    accessibilityLabel={`Food photo: ${item.name}`}
                  />
                )}
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{item.name}</Text>
                  <Text style={styles.resultMeta}>
                    Health {formatScore(item.health_index)} · Safety {formatScore(item.overall_safety_score)}
                  </Text>
                  {!!item.molecule_names?.length && (
                    <Text style={styles.resultMeta} numberOfLines={1}>
                      {item.molecule_names.slice(0, 4).join(", ")}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {moleculeResults.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Molecules</Text>
            {moleculeResults.map((molecule) => (
              <Pressable key={molecule.id} style={styles.resultItem} onPress={() => navigation.navigate("MoleculeDetail", { id: molecule.id })}>
                {molecule.structure_image_url && (
                  <Image
                    source={{ uri: molecule.structure_image_url }}
                    style={styles.moleculeImage}
                    accessibilityLabel={`Molecular structure: ${molecule.name}`}
                  />
                )}
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{molecule.name}</Text>
                  <Text style={styles.resultMeta}>
                    Harm {molecule.harm_level ?? "unknown"}
                    {molecule.molecular_formula ? ` · ${molecule.molecular_formula}` : ""}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 8 },
  status: { marginTop: 16, color: "#475569" },
  error: { color: "#b91c1c" },
  results: { paddingTop: 16, gap: 10 },
  resultSection: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  resultItem: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, backgroundColor: "#fff" },
  resultImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#f8fafc" },
  moleculeImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#f8fafc" },
  resultContent: { flex: 1, minWidth: 0 },
  resultTitle: { fontSize: 17, fontWeight: "700", textTransform: "capitalize" },
  resultMeta: { marginTop: 4, color: "#64748b" },
});
