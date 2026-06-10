import { useEffect } from "react";
import { Button, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";
import { useHistoryStore } from "../stores/useHistoryStore";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const history = useHistoryStore((state) => state.history);
  const loadHistory = useHistoryStore((state) => state.load);
  const clearHistory = useHistoryStore((state) => state.clear);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>nutrii</Text>
      <Text style={styles.subtitle}>Know what you eat</Text>
      <View style={styles.buttonRow}>
        <Button title="Search" onPress={() => navigation.navigate("Search")} />
        <Button title="Scan Label" onPress={() => navigation.navigate("Scan")} />
      </View>
      {history.length > 0 && (
        <View style={styles.historyPanel}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Recent scans</Text>
            <Button title="Clear" onPress={clearHistory} />
          </View>
          {history.slice(0, 5).map((item) => (
            <Pressable
              key={`${item.id}-${item.scannedAt}`}
              style={styles.historyItem}
              onPress={() => navigation.navigate("FoodDetail", { id: item.id })}
            >
              {item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.historyImage}
                  accessibilityLabel={`Food photo: ${item.name}`}
                />
              )}
              <View style={styles.historyContent}>
                <Text style={styles.historyName}>{item.name}</Text>
                <Text style={styles.historyDate}>{new Date(item.scannedAt).toLocaleString()}</Text>
              </View>
              {item.health_index != null && (
                <Text style={styles.historyScore}>{item.health_index}</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 48, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 18, color: "#666", marginBottom: 24 },
  buttonRow: { flexDirection: "row", gap: 16 },
  historyPanel: { alignSelf: "stretch", marginTop: 32, gap: 10 },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyTitle: { fontSize: 18, fontWeight: "700" },
  historyItem: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, backgroundColor: "#fff" },
  historyImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#f8fafc" },
  historyContent: { flex: 1, minWidth: 0 },
  historyName: { fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  historyDate: { marginTop: 4, color: "#64748b" },
  historyScore: { minWidth: 36, textAlign: "center", color: "#166534", fontSize: 16, fontWeight: "800" },
});
