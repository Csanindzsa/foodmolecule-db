import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api, type BanListEntry } from "../lib/api";
import { asArray } from "../lib/array";
import { formatLethalDose } from "../lib/banListDisplay";
import { validRouteId } from "../lib/routeId";
import { formatOptionalText } from "../lib/textDisplay";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "BanList">;

export default function BanListScreen({ navigation }: Props) {
  const [entries, setEntries] = useState<BanListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api.banList()
      .then((response) => {
        if (isMounted) setEntries(asArray(response.results));
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load ban list");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
        <Text style={styles.error}>Failed to load ban list</Text>
        <Text style={styles.meta}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Ban List</Text>
      <Text style={styles.description}>
        Draft safety signals and conditional warnings. Citation verification required before treating entries as verified production claims.
      </Text>
      {entries.length === 0 ? (
        <Text style={styles.meta}>No ban list entries found.</Text>
      ) : entries.map((entry) => {
        const foodName = formatOptionalText(entry.food?.name) ?? "Unknown food";
        const category = formatOptionalText(entry.food?.category);
        const reason = formatOptionalText(entry.reason) ?? "No reason listed.";
        const safeCondition = formatOptionalText(entry.safe_condition);
        const foodId = validRouteId(entry.food?.id);

        return (
        <View key={entry.id} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View style={styles.entryTitleWrap}>
              <Text style={styles.foodName}>{foodName}</Text>
              {category && <Text style={styles.meta}>{category}</Text>}
            </View>
            <Text style={entry.is_conditionally_safe ? styles.conditionalBadge : styles.absoluteBadge}>
              {entry.is_conditionally_safe ? "Conditional" : "Absolute"}
            </Text>
          </View>
          <Text style={styles.reason}>{reason}</Text>
          <Text style={styles.meta}>Lethal dose: {formatLethalDose(entry.lethal_dose_mg)}</Text>
          {safeCondition && <Text style={styles.meta}>Safe condition: {safeCondition}</Text>}
          <Text style={styles.citationBadge}>Citation-required draft</Text>
          {!!foodId && (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("FoodDetail", { id: foodId })}
              style={styles.detailLink}
            >
              <Text style={styles.detailLinkText}>Open food detail</Text>
            </Pressable>
          )}
        </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  description: { color: "#475569", lineHeight: 20, marginBottom: 16 },
  entry: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: "#fff" },
  entryHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  entryTitleWrap: { flex: 1, minWidth: 0 },
  foodName: { fontSize: 17, fontWeight: "800", color: "#0f172a", textTransform: "capitalize" },
  reason: { color: "#334155", lineHeight: 20, marginBottom: 8 },
  conditionalBadge: { color: "#854d0e", backgroundColor: "#fef3c7", fontSize: 12, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  absoluteBadge: { color: "#991b1b", backgroundColor: "#fee2e2", fontSize: 12, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  citationBadge: { alignSelf: "flex-start", marginTop: 8, color: "#92400e", backgroundColor: "#fffbeb", fontSize: 12, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  detailLink: { alignSelf: "flex-start", marginTop: 8, paddingVertical: 6 },
  detailLinkText: { color: "#047857", fontWeight: "800" },
  meta: { color: "#64748b", marginTop: 4 },
  error: { color: "#b91c1c", fontWeight: "700" },
});
