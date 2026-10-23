
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface OtpScreenProps {
  phone: string;
  channel: "phone" | "email"
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
}

export default function OtpScreen({
  phone,
  channel,
  onVerify,
  onResend,
  onBack,
}: OtpScreenProps) {
  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(30);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setTimeout(() => {
      setSeconds((value) => value - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds]);

  async function handleVerify() {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter all six digits of your verification code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onVerify(otp);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verification failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resending || seconds > 0) return;

    setResending(true);
    setError("");

    try {
      await onResend();
      setOtp("");
      setSeconds(30);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resend the code."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View pointerEvents="none" style={styles.ambientGlow}>
        <View style={styles.glowLarge} />
        <View style={styles.glowSmall} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back to phone number entry"
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <View style={styles.content}>
              <View style={styles.iconCircle}>
                <View style={styles.iconInner}>
                  <Text style={styles.icon}>✳</Text>
                </View>
              </View>

              <Text style={styles.brand}>
                MINI<Text style={styles.brandAccent}>LEDGER</Text>
              </Text>

              
              <Text style={styles.step}>
                {channel === "phone"
                  ? "PHONE VERIFICATION"
                  : "EMAIL VERIFICATION"}
                {"  ·  "}
                {channel === "phone" ? "01 / 02" : "02 / 02"}
              </Text>

              <Text style={styles.title}>
                One small{"\n"}
                <Text style={styles.titleAccent}>step.</Text>
              </Text>

              <Text style={styles.subtitle}>
                {channel === "phone"
                  ? "Enter the six-digit code shown in your backend terminal."
                  : "Enter the six-digit code sent to your email."}
              </Text>


              <View style={styles.phoneBadge}>
                <View style={styles.phoneDot} />
                <Text style={styles.phone} numberOfLines={1}>
                  {phone}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>VERIFICATION CODE</Text>

              <View
                style={[
                  styles.otpBox,
                  !!error && styles.otpBoxError,
                  otp.length === 6 && styles.otpBoxComplete,
                ]}
              >
                <TextInput
                  accessibilityLabel="Six-digit verification code"
                  value={otp}
                  onChangeText={(value) => {
                    setOtp(value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete={channel === "phone" ? "sms-otp" : "one-time-code"}
                  maxLength={6}
                  editable={!loading}
                  style={styles.otpInput}
                  placeholder="000000"
                  placeholderTextColor="#51485F"
                  selectionColor="#B58AFF"
                  autoFocus
                />

                <View style={styles.digitHintRow}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.digitHint,
                        otp.length > index && styles.digitHintFilled,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {!!error && (
                <View style={styles.errorRow}>
                  <Text style={styles.errorIcon}>!</Text>
                  <Text style={styles.error}>{error}</Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                onPress={handleVerify}
                disabled={loading}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  loading && styles.disabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      Verify and continue
                    </Text>
                    <Text style={styles.buttonArrow}>→</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.resendRow}>
                <Text style={styles.resendLabel}>
                  Didn't receive the code?
                </Text>

                {seconds > 0 ? (
                  <Text style={styles.countdown}>
                    Resend in{" "}
                    <Text style={styles.countdownValue}>
                      00:{String(seconds).padStart(2, "0")}
                    </Text>
                  </Text>
                ) : (
                  <Pressable
                    disabled={resending}
                    onPress={handleResend}
                    accessibilityRole="button"
                  >
                    <Text style={styles.resendAction}>
                      {resending ? "Sending..." : "Resend code"}
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.securityNote}>
                <Text style={styles.securityIcon}>◆</Text>
                <Text style={styles.securityText}>
                  Your verification is encrypted and secure.
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={styles.footerText}>
                YOUR MONEY. YOUR CLARITY.
              </Text>
              <View style={styles.footerLine} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#09070F",
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 14,
    paddingBottom: 22,
  },
  ambientGlow: {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  overflow: "hidden",
},
  glowLarge: {
    position: "absolute",
    top: 100,
    right: -125,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#472077",
    opacity: 0.19,
  },
  glowSmall: {
    position: "absolute",
    bottom: 50,
    left: -120,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#35145D",
    opacity: 0.15,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#17131F",
    borderWidth: 1,
    borderColor: "#30273D",
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 8,
    gap: 8,
  },
  backArrow: {
    color: "#D6C1FF",
    fontSize: 25,
    lineHeight: 27,
  },
  backText: {
    color: "#D8D0E4",
    fontSize: 13,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 28,
    paddingBottom: 32,
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 23,
    backgroundColor: "#211531",
    borderWidth: 1,
    borderColor: "#493064",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 23,
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: "#35204B",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    color: "#C5A1FF",
    fontSize: 28,
  },
  brand: {
    color: "#F5F0FC",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 24,
  },
  brandAccent: {
    color: "#B990FF",
  },
  step: {
    fontSize: 10,
    letterSpacing: 1.7,
    color: "#9B8AAE",
    fontWeight: "700",
    marginBottom: 13,
  },
  title: {
    fontSize: 43,
    lineHeight: 48,
    letterSpacing: -1.6,
    color: "#F7F2FC",
    fontWeight: "600",
  },
  titleAccent: {
    color: "#B990FF",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#A99DB7",
    marginTop: 16,
  },
  phoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#191320",
    borderWidth: 1,
    borderColor: "#30243F",
    gap: 9,
  },
  phoneDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#B990FF",
  },
  phone: {
    flexShrink: 1,
    color: "#E2D4F5",
    fontSize: 13,
    fontWeight: "600",
  },
  fieldLabel: {
    color: "#9F91B0",
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 12,
  },
  otpBox: {
    backgroundColor: "#15111D",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#3A2B4D",
    paddingHorizontal: 14,
    paddingTop: 7,
    paddingBottom: 13,
  },
  otpBoxError: {
    borderColor: "#F07886",
  },
  otpBoxComplete: {
    borderColor: "#8060AC",
  },
  otpInput: {
    height: 55,
    color: "#F8F2FF",
    fontSize: 27,
    fontWeight: "600",
    letterSpacing: 10,
    textAlign: "center",
    paddingLeft: 10,
  },
  digitHintRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 13,
    marginTop: 1,
  },
  digitHint: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#3A3047",
  },
  digitHintFilled: {
    backgroundColor: "#B990FF",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  errorIcon: {
    color: "#FF9BA6",
    borderWidth: 1,
    borderColor: "#9C4656",
    width: 17,
    height: 17,
    borderRadius: 9,
    textAlign: "center",
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "700",
  },
  error: {
    flex: 1,
    color: "#FF9BA6",
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    marginTop: 23,
    minHeight: 57,
    borderRadius: 18,
    backgroundColor: "#8855D9",
    borderWidth: 1,
    borderColor: "#A779F0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#8C4DDE",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonArrow: {
    position: "absolute",
    right: 19,
    color: "#FFFFFF",
    fontSize: 23,
  },
  resendRow: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  resendLabel: {
    color: "#8E829C",
    fontSize: 12,
  },
  countdown: {
    color: "#A99AB9",
    fontSize: 12,
  },
  countdownValue: {
    color: "#D6BFFF",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  resendAction: {
    color: "#C5A0FF",
    fontSize: 12,
    fontWeight: "700",
  },
  securityNote: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 32,
  },
  securityIcon: {
    color: "#9F7ACF",
    fontSize: 9,
  },
  securityText: {
    color: "#80748D",
    fontSize: 11,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 10,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#292131",
  },
  footerText: {
    color: "#756783",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  pressed: {
    opacity: 0.75,
  },
});
