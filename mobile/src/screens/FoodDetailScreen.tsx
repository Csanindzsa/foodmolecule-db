import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api, type FoodDetail, type Study } from "../lib/api";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "FoodDetail">;

export default function FoodDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [food, setFood] = useState<FoodDetail | null>(null);
  const [studies, setStudies] = useState<Study[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studiesLoading, setStudiesLoading] = useState(true);
  const [studiesError, setStudiesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setStudiesLoading(true);
    setError(null);
    setStudiesError(null);
    setStudies([]);

    api.food(id)
      .then((response) => {
        if (isMounted) setFood(response);
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load food");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    api.foodStudies(id)
      .then((response) => {
        if (isMounted) setStudies(response.results.slice(0, 3));
      })
      .catch((err) => {
        if (isMounted) setStudiesError(err instanceof Error ? err.message : "Failed to load research");
      })
      .finally(() => {
        if (isMounted) setStudiesLoading(false);
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

  if (!food) {
    return (
      <View style={styles.container}>
        <Text>No food data available.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {food.image_url && (
        <Image
          source={{ uri: food.image_url }}
          style={styles.heroImage}
          accessibilityLabel={`Food photo: ${food.name}`}
        />
      )}
      <Text style={styles.title}>{food.name}</Text>
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Health</Text>
          <Text style={styles.scoreValue}>{food.health_index ?? "?"}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Safety</Text>
          <Text style={styles.scoreValue}>{food.overall_safety_score ?? "?"}</Text>
        </View>
      </View>
      {!!food.origin && <Text style={styles.meta}>Origin: {food.origin}</Text>}
      {!!food.aliases?.length && <Text style={styles.meta}>Also known as: {food.aliases.join(", ")}</Text>}
      <Text style={styles.sectionTitle}>Molecules</Text>
      {food.molecules.length > 0 ? food.molecules.map((entry) => (
        <View key={entry.molecule.id} style={styles.moleculeItem}>
          <Text style={styles.moleculeName}>{entry.molecule.name}</Text>
          <Text style={styles.meta}>
            Harm {entry.molecule.harm_level ?? "unknown"} · {entry.amount_per_100g ?? "unknown"} {entry.unit || ""}
          </Text>
        </View>
      )) : (
        <Text style={styles.meta}>No molecule data available.</Text>
      )}
      <Text style={styles.sectionTitle}>Latest Research</Text>
      {studiesLoading ? (
        <Text style={styles.meta}>Loading research...</Text>
      ) : studiesError ? (
        <Text style={styles.meta}>Research is unavailable right now.</Text>
      ) : studies.length > 0 ? studies.map((study) => (
        <View key={study.id} style={styles.researchItem}>
          <Text style={styles.researchTitle}>{study.title}</Text>
          {!!study.ai_summary && <Text style={styles.researchSummary}>{study.ai_summary}</Text>}
          <Text style={styles.meta}>
            PMID {study.pmid}
            {study.publication_year ? ` · ${study.publication_year}` : ""}
            {study.ai_confidence ? ` · AI confidence: ${study.ai_confidence}` : ""}
          </Text>
          {!!study.url && (
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(study.url as string)}
              style={styles.pubmedLink}
            >
              <Text style={styles.pubmedLinkText}>Open PubMed</Text>
            </Pressable>
          )}
        </View>
      )) : (
        <Text style={styles.meta}>No linked research available.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroImage: { width: "100%", height: 180, borderRadius: 12, marginBottom: 16, backgroundColor: "#f8fafc" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 16, textTransform: "capitalize" },
  scoreRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  scoreBox: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 14, backgroundColor: "#fff" },
  scoreLabel: { color: "#64748b", fontWeight: "600" },
  scoreValue: { marginTop: 4, fontSize: 28, fontWeight: "800" },
  sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 18, fontWeight: "700" },
  moleculeItem: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginBottom: 10, backgroundColor: "#fff" },
  moleculeName: { fontSize: 16, fontWeight: "700" },
  researchItem: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginBottom: 10, backgroundColor: "#fff" },
  researchTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  researchSummary: { color: "#334155", marginTop: 6, lineHeight: 20 },
  pubmedLink: { alignSelf: "flex-start", marginTop: 8, paddingVertical: 6 },
  pubmedLinkText: { color: "#047857", fontWeight: "700" },
  meta: { color: "#64748b", marginTop: 4 },
  error: { color: "#b91c1c" },
});
