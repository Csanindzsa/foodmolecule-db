import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Button, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api, type Study } from "../lib/api";

function impactLabel(value?: number | null): string | null {
  if (value == null) return null;
  return value > 0 ? `+${value}` : String(value);
}

export default function ResearchScreen() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudies = useCallback(() => {
    setIsLoading(true);
    setError(null);
    api.recentStudies()
      .then((response) => setStudies(response.results.slice(0, 25)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load research"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadStudies();
  }, [loadStudies]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.meta}>Loading latest research...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Research is unavailable right now.</Text>
        <Text style={styles.meta}>{error}</Text>
        <Button title="Retry" onPress={loadStudies} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Latest Research</Text>
      <Text style={styles.subtitle}>Recent AI-analyzed PubMed studies with safety and health impact context.</Text>

      {studies.length === 0 ? (
        <Text style={styles.meta}>No analyzed research studies found.</Text>
      ) : studies.map((study) => (
        <View key={study.id} style={styles.studyCard}>
          <Text style={styles.studyTitle}>{study.title}</Text>
          {!!study.ai_summary && <Text style={styles.summary}>{study.ai_summary}</Text>}
          <View style={styles.metaBlock}>
            <Text style={styles.meta}>
              PMID {study.pmid}
              {study.publication_year ? ` · ${study.publication_year}` : ""}
              {study.journal ? ` · ${study.journal}` : ""}
            </Text>
            {!!study.ai_confidence && <Text style={styles.meta}>AI confidence: {study.ai_confidence}</Text>}
            <Text style={styles.meta}>
              {impactLabel(study.ai_safety_impact) ? `Safety impact: ${impactLabel(study.ai_safety_impact)}` : "Safety impact: not scored"}
              {" · "}
              {impactLabel(study.ai_health_impact) ? `Health impact: ${impactLabel(study.ai_health_impact)}` : "Health impact: not scored"}
            </Text>
          </View>
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
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  subtitle: { color: "#475569", lineHeight: 20, marginBottom: 18 },
  studyCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: "#fff" },
  studyTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  summary: { color: "#334155", marginTop: 8, lineHeight: 20 },
  metaBlock: { marginTop: 8, gap: 4 },
  meta: { color: "#64748b" },
  pubmedLink: { alignSelf: "flex-start", marginTop: 10, paddingVertical: 6 },
  pubmedLinkText: { color: "#047857", fontWeight: "700" },
  error: { color: "#b91c1c", fontWeight: "700" },
});
