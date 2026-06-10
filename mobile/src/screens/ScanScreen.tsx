import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Button, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api, type ScanResponse } from "../lib/api";
import { asArray } from "../lib/array";
import { validRouteId } from "../lib/routeId";
import { externalHttpUrl } from "../lib/safeUrl";
import { formatHazardLevel, ingredientTerms, rawOcrPreview } from "../lib/scanDisplay";
import { formatPercent, formatScore, normalizeScore } from "../lib/scoreDisplay";
import type { RootStackParamList } from "../navigation/types";
import { useHistoryStore } from "../stores/useHistoryStore";

type Props = NativeStackScreenProps<RootStackParamList, "Scan">;

export default function ScanScreen({ navigation }: Props) {
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addHistory = useHistoryStore((state) => state.add);

  function firstAssetUri(result: ImagePicker.ImagePickerResult): string | null {
    if (result.canceled) return null;
    return result.assets[0]?.uri ?? null;
  }

  async function scanPickerResult(result: ImagePicker.ImagePickerResult) {
    const uri = firstAssetUri(result);
    if (!uri) {
      if (!result.canceled) {
        setScanResult(null);
        setError("No image was selected.");
      }
      return;
    }
    await scanUri(uri);
  }

  async function scanUri(uri: string) {
    setIsScanning(true);
    setError(null);
    try {
      const response = await api.scanImage(uri);
      response.foods = asArray(response.foods);
      response.ingredients = asArray(response.ingredients);
      setScanResult(response);
      for (const food of response.foods.slice(0, 5)) {
        addHistory({
          id: food.id,
          name: food.name,
          image_url: food.image_url,
          health_index: normalizeScore(food.health_index),
          scannedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setScanResult(null);
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setIsScanning(false);
    }
  }

  const detectedIngredients = scanResult ? ingredientTerms(scanResult.ingredients, 16) : [];
  const matchedFoods = scanResult ? asArray(scanResult.foods) : [];
  const rawText = scanResult ? rawOcrPreview(scanResult.raw_text) : null;

  async function takePictureAndScan() {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
      });
      await scanPickerResult(result);
    } catch (err) {
      setScanResult(null);
      setError(err instanceof Error ? err.message : "Camera scan failed");
    }
  }

  async function pickImageAndScan() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      await scanPickerResult(result);
    } catch (err) {
      setScanResult(null);
      setError(err instanceof Error ? err.message : "Image selection failed");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scan Ingredient Label</Text>
      <View style={styles.actions}>
        <Button title="Take Photo" onPress={takePictureAndScan} disabled={isScanning} />
        <Button title="Choose Image" onPress={pickImageAndScan} disabled={isScanning} />
      </View>
      {isScanning && <ActivityIndicator style={styles.status} />}
      {error && <Text style={[styles.status, styles.error]}>{error}</Text>}
      {scanResult && (
        <View style={styles.resultPanel}>
          <Text style={styles.sectionTitle}>Detected ingredients</Text>
          <Text style={styles.meta}>OCR confidence {formatPercent(scanResult.confidence)}</Text>
          {detectedIngredients.length > 0 ? (
            <View style={styles.chipWrap}>
              {detectedIngredients.map((ingredient) => (
                <Text key={ingredient} style={styles.chip}>{ingredient}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.meta}>No ingredient terms detected.</Text>
          )}

          <Text style={styles.sectionTitle}>Matched foods</Text>
          {matchedFoods.length > 0 ? matchedFoods.map((food) => {
            const imageUrl = externalHttpUrl(food.image_url);
            const foodId = validRouteId(food.id);

            return (
              <Pressable
                key={food.id}
                style={styles.matchItem}
                disabled={!foodId}
                onPress={() => {
                  if (foodId) navigation.navigate("FoodDetail", { id: foodId });
                }}
              >
                {imageUrl && (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.matchImage}
                    accessibilityLabel={`Food photo: ${food.name}`}
                  />
                )}
                <View style={styles.matchContent}>
                  <Text style={styles.matchTitle}>{food.name}</Text>
                  <Text style={styles.meta}>
                    Health {formatScore(food.health_index)} · Hazard {formatHazardLevel(food.max_molecule_harm)}
                  </Text>
                </View>
              </Pressable>
            );
          }) : (
            <Text style={styles.meta}>No food matches found.</Text>
          )}

          {!!rawText && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>
                  Raw OCR{scanResult.raw_text_truncated ? " preview" : ""}
                </Text>
                {scanResult.raw_text_truncated && <Text style={styles.badge}>Truncated</Text>}
              </View>
              {scanResult.raw_text_truncated && (
                <Text style={styles.meta}>The full OCR text was longer than the API response limit.</Text>
              )}
              <Text style={styles.rawText}>{rawText}</Text>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  actions: { gap: 12 },
  status: { marginTop: 16, color: "#475569" },
  error: { color: "#b91c1c" },
  resultPanel: { marginTop: 20, gap: 12 },
  sectionHeader: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { marginTop: 8, fontSize: 18, fontWeight: "700" },
  sectionTitleInline: { marginTop: 0 },
  meta: { color: "#64748b" },
  badge: {
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 999,
    color: "#92400e",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  matchItem: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, backgroundColor: "#fff" },
  matchImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#f8fafc" },
  matchContent: { flex: 1, minWidth: 0 },
  matchTitle: { fontSize: 17, fontWeight: "700", textTransform: "capitalize" },
  rawText: { color: "#334155", lineHeight: 20 },
});
