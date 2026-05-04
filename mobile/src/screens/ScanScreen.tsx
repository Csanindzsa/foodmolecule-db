import { Button, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

export default function ScanScreen() {
  const [ocrResult, setOcrResult] = useState<string | null>(null);

  async function takePictureAndScan() {
    // TODO: integrate expo-camera + OCR pipeline
    setOcrResult("Placeholder OCR result");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Ingredient Label</Text>
      <Button title="Capture & Analyze" onPress={takePictureAndScan} />
      {ocrResult && <Text style={styles.result}>{ocrResult}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  result: { marginTop: 20, fontSize: 16, color: "#333" },
});
