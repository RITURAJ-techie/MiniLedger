import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  onContinue: (phone: string) => Promise<void>;
  onBack: () => void;
};

const C = {
  bg: "#09060E",
  card: "#16121B",
  border: "#2A2432",
  field: "#100C15",
  fieldBorder: "#332C3C",
  accent: "#A86AFF",
  button: "#9A57F2",
  text: "#FFFFFF",
  muted: "#A79DB4",
  faint: "#7B7088",
  red: "#FF8498",
};

export default function LoginScreen({ onContinue, onBack }: Props) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    Keyboard.dismiss();
    setError("");

    // Indian mobile number: 10 digits, starting from 6–9.
    const normalized = phone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(normalized)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);
      await onContinue(`+91${normalized}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to request OTP.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>

        <Text style={styles.brand}>MiniLedger</Text>
        <Text style={styles.heading}>Welcome back.</Text>
        <Text style={styles.subtitle}>
          Enter your registered mobile number to sign in.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Mobile number</Text>

          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.countryCodeText}>+91</Text>
              <Text style={styles.countryArrow}>⌄</Text>
            </View>

            <TextInput
              value={phone}
              onChangeText={(value) => {
                setPhone(value.replace(/\D/g, "").slice(0, 10));
                setError("");
              }}
              placeholder="9876543210"
              placeholderTextColor={C.faint}
              keyboardType="number-pad"
              keyboardAppearance="dark"
              autoComplete="tel-national"
              textContentType="telephoneNumber"
              autoCorrect={false}
              maxLength={10}
              style={styles.input}
              accessibilityLabel="10-digit mobile number"
              onSubmitEditing={handleContinue}
              returnKeyType="done"
            />
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : (
            <Text style={styles.helper}>
              We'll verify your number with a one-time code.
            </Text>
          )}

          <Pressable
            onPress={handleContinue}
            disabled={loading}
            style={[styles.button, loading && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={C.text} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={onBack} style={styles.footerButton}>
          <Text style={styles.footerText}>
            New to MiniLedger? Create an account
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  back: {
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  backText: {
    color: C.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  brand: {
    color: C.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 32,
  },
  heading: {
    color: C.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: C.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 28,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 22,
  },
  label: {
    color: "#E6DDF0",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countryCode: {
    minHeight: 54,
    minWidth: 94,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.fieldBorder,
    borderRadius: 16,
    backgroundColor: C.field,
  },
  flag: {
    fontSize: 18,
  },
  countryCodeText: {
    color: C.text,
    fontSize: 16,
    fontWeight: "600",
  },
  countryArrow: {
    color: C.muted,
    fontSize: 15,
    marginLeft: 1,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    borderWidth: 1,
    borderColor: C.fieldBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: C.field,
    color: C.text,
    fontSize: 16,
  },
  helper: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 20,
  },
  error: {
    color: C.red,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 20,
  },
  button: {
    minHeight: 54,
    borderRadius: 28,
    backgroundColor: C.button,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
  },
  footerButton: {
    alignItems: "center",
    marginTop: 24,
    padding: 8,
  },
  footerText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});