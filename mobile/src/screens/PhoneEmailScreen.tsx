
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Application from "expo-application";

const CLIENT_ID = "12686717011025291989";

interface PhoneEmailScreenProps {
  onVerified: (token: string) => Promise<void>;
  onBack: () => void;
  phone: string;
}

export default function PhoneEmailScreen({ onVerified, onBack , phone}: PhoneEmailScreenProps) {
  const [deviceId, setDeviceId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadDeviceId() {
      try {
        const id =
          Application.getAndroidId() ??
          (await Application.getIosIdForVendorAsync()) ??
          "miniledger-device";
        if (active) setDeviceId(id);
      } catch {
        if (active) setDeviceId("miniledger-device");
      }
    }

    void loadDeviceId();
    return () => {
      active = false;
    };
  }, []);

  async function handleMessage(event: { nativeEvent: { data: string } }) {
    if (processingRef.current) return;

    const token = event.nativeEvent.data?.trim();
    if (!token || token.length > 10000) {
      setError("Phone verification returned an invalid response.");
      return;
    }

    processingRef.current = true;
    setLoading(true);
    setError("");

    try {
      await onVerified(token);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Phone verification failed. Please try again.",
      );
    } finally {
      processingRef.current = false;
      setLoading(false);
    }
  }

  if (!deviceId) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#A86AFF" />
        <Text style={styles.message}>Preparing phone verification...</Text>
      </SafeAreaView>
    );
  }

  const url =
    `https://auth.phone.email/log-in?client_id=${CLIENT_ID}` +
    `&auth_type=4&device=${encodeURIComponent(deviceId)}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Verify your phone</Text>
        <Text style={styles.subtitle}>
          Complete verification securely with Phone.Email.
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.webViewContainer}>
        <WebView
          source={{ uri: url }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          onError={() =>
            setError("Unable to load phone verification. Check your internet.")
          }
          style={styles.webView}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#A86AFF" />
            <Text style={styles.message}>Verifying your phone...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09060E" },
  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 18 },
  backButton: { alignSelf: "flex-start", paddingVertical: 8, marginBottom: 18 },
  backText: { color: "#A86AFF", fontSize: 16 },
  title: { color: "#FFFFFF", fontSize: 25, fontWeight: "700" },
  subtitle: { color: "#A79DB4", fontSize: 14, marginTop: 8 },
  webViewContainer: {
    flex: 1,
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  webView: { flex: 1, backgroundColor: "#FFFFFF" },
  error: { color: "#FF6B81", paddingHorizontal: 22, paddingBottom: 12 },
  message: { color: "#A79DB4", marginTop: 12, textAlign: "center" },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#09060E",
  },
});
