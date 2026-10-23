import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onContinue: (phone: string) => Promise<void>;
  onBack: () => void;
};

const C = {
  bg: "#09060E",
  glowA: "#5B2A9A",
  glowB: "#7B3FE4",
  card: "#16121B",
  cardBorder: "#2A2432",
  field: "#100C15",
  fieldBorder: "#332C3C",
  accent: "#A86AFF",
  button: "#9A57F2",
  buttonBorder: "#B98AFF",
  text: "#FFFFFF",
  muted: "#A79DB4",
  faint: "#7B7088",
  red: "#FF4D6A",
  green: "#4ADE9B",
};

const PHONE_LENGTH = 10;

const ArrowIcon = () => (
  <View style={styles.arrowContainer}>
    <View style={styles.arrowLine} />
    <View style={styles.arrowHead} />
  </View>
);

const LockIcon = () => (
  <View style={styles.lockContainer}>
    <View style={styles.lockTop} />
    <View style={styles.lockBody} />
  </View>
);

const CheckIcon = () => <View style={styles.check} />;

// Shows a 10-digit number as "98765 43210" while typing.
function formatPhone(digits: string) {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

export default function LoginScreen({ onContinue, onBack }: Props) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { height } = useWindowDimensions();
  const compact = height < 720;

  const isValid = /^[6-9]\d{9}$/.test(phone);

  const breathe = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const focus = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const ready = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    Animated.timing(entrance, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => loop.stop();
  }, [breathe, entrance]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: phone.length / PHONE_LENGTH,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [phone, progress]);

  useEffect(() => {
    Animated.spring(ready, {
      toValue: isValid ? 1 : 0,
      speed: 18,
      bounciness: 10,
      useNativeDriver: true,
    }).start();
  }, [isValid, ready]);

  const readyClamped = ready.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: "clamp",
  });

  const glowOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.5],
  });

  const glowScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  // Staggered fade + rise for each block of the screen.
  const rise = (start: number) => ({
    opacity: entrance.interpolate({
      inputRange: [start, Math.min(start + 0.5, 1)],
      outputRange: [0, 1],
      extrapolate: "clamp",
    }),
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [start, Math.min(start + 0.5, 1)],
          outputRange: [18, 0],
          extrapolate: "clamp",
        }),
      },
    ],
  });

  const animateFocus = (toValue: number) => {
    Animated.timing(focus, {
      toValue,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const fieldBorder = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [C.fieldBorder, C.accent],
  });

  const fieldGlow = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const triggerShake = () => {
    Animated.sequence(
      [10, -10, 7, -7, 0].map((toValue) =>
        Animated.timing(shake, {
          toValue,
          duration: 55,
          useNativeDriver: true,
        })
      )
    ).start();
  };

  const fail = (message: string) => {
    setError(message);
    triggerShake();
  };

  const animatePress = (toValue: number) => {
    Animated.spring(press, {
      toValue,
      speed: 28,
      bounciness: 7,
      useNativeDriver: false,
    }).start();
  };

  const buttonScale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.97],
  });

  const buttonBg = press.interpolate({
    inputRange: [0, 1],
    outputRange: [C.button, "#B27AFF"],
  });

  const buttonBorder = press.interpolate({
    inputRange: [0, 1],
    outputRange: [C.buttonBorder, "#FFFFFF"],
  });

  const buttonGlow = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.65],
  });

  async function handleContinue() {
    Keyboard.dismiss();
    setError("");

    // Indian mobile number: 10 digits, starting from 6–9.
    const normalized = phone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(normalized)) {
      fail("Enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);
      await onContinue(`+91${normalized}`);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Unable to request OTP.");
    } finally {
      setLoading(false);
    }
  }

  const progressColor = error ? C.red : isValid ? C.green : C.accent;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.screen}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowTop,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />

        <View pointerEvents="none" style={styles.glowSide} />

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            <View style={styles.container}>
              <Animated.View style={[styles.topRow, rise(0)]}>
                <Pressable
                  onPress={onBack}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.backButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Back to registration"
                >
                  <View style={styles.backChevron} />
                </Pressable>

                <View style={styles.brandRow}>
                  <Image
                    source={require("../../assets/miniledger-logo.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                    accessibilityLabel="MiniLedger logo"
                  />
                  <Text style={styles.brandName}>MiniLedger</Text>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.hero,
                  compact && styles.heroCompact,
                  rise(0.1),
                ]}
              >
                <View style={styles.badge}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.badgeText}>Secure sign in</Text>
                </View>

                <Text style={[styles.heading, compact && styles.headingCompact]}>
                  Welcome{"\n"}back.
                </Text>

                <Text style={styles.subtitle}>
                  Pick up right where you left off — your ledger is waiting.
                </Text>
              </Animated.View>

              <Animated.View style={rise(0.25)}>
                <Animated.View
                  style={[styles.card, { transform: [{ translateX: shake }] }]}
                >
                  <Text style={styles.cardTitle}>Sign in</Text>

                  <Text style={styles.cardSubtitle}>
                    Enter your registered mobile number.
                  </Text>

                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>Mobile number</Text>
                    <Text
                      style={[
                        styles.counter,
                        isValid && { color: C.green },
                      ]}
                    >
                      {phone.length}/{PHONE_LENGTH}
                    </Text>
                  </View>

                  <Animated.View
                    style={[
                      styles.phoneInputContainer,
                      {
                        borderColor: error ? C.red : fieldBorder,
                        shadowColor: error ? C.red : C.accent,
                        shadowOpacity: fieldGlow,
                      },
                    ]}
                  >
                    <View style={styles.countrySelector}>
                      <Text style={styles.flag}>🇮🇳</Text>
                      <Text style={styles.callingCode}>+91</Text>
                    </View>

                    <View style={styles.inputDivider} />

                    <TextInput
                      value={formatPhone(phone)}
                      onChangeText={(value) => {
                        setPhone(value.replace(/\D/g, "").slice(0, PHONE_LENGTH));
                        if (error) setError("");
                      }}
                      onFocus={() => animateFocus(1)}
                      onBlur={() => animateFocus(0)}
                      placeholder="98765 43210"
                      placeholderTextColor={C.faint}
                      selectionColor={C.accent}
                      keyboardType="number-pad"
                      keyboardAppearance="dark"
                      autoComplete="tel-national"
                      textContentType="telephoneNumber"
                      autoCorrect={false}
                      maxLength={PHONE_LENGTH + 1}
                      style={styles.phoneInput}
                      accessibilityLabel="10-digit mobile number"
                      onSubmitEditing={handleContinue}
                      returnKeyType="done"
                    />

                    <Animated.View
                      style={[
                        styles.checkBadge,
                        {
                          opacity: readyClamped,
                          transform: [{ scale: readyClamped }],
                        },
                      ]}
                    >
                      <CheckIcon />
                    </Animated.View>
                  </Animated.View>

                  <View style={styles.progressTrack}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: progressWidth,
                          backgroundColor: progressColor,
                        },
                      ]}
                    />
                  </View>

                  {error ? (
                    <Text accessibilityRole="alert" style={styles.errorText}>
                      {error}
                    </Text>
                  ) : (
                    <Text style={styles.helperText}>
                      {isValid
                        ? "Looks good! Tap continue to get your code."
                        : "We’ll verify your number with a one-time code."}
                    </Text>
                  )}

                  <Pressable
                    onPress={handleContinue}
                    onPressIn={() => animatePress(1)}
                    onPressOut={() => animatePress(0)}
                    onHoverIn={() => animatePress(0.4)}
                    onHoverOut={() => animatePress(0)}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Continue to verification"
                    accessibilityState={{
                      disabled: loading,
                      busy: loading,
                    }}
                  >
                    <Animated.View
                      style={[
                        styles.continueButton,
                        (loading || !isValid) && styles.continueButtonMuted,
                        {
                          backgroundColor: buttonBg,
                          borderColor: buttonBorder,
                          shadowOpacity: buttonGlow,
                          transform: [{ scale: buttonScale }],
                        },
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.continueButtonText}>Continue</Text>
                          <ArrowIcon />
                        </>
                      )}
                    </Animated.View>
                  </Pressable>

                  <View style={styles.securityNote}>
                    <LockIcon />
                    <Text style={styles.securityText}>
                      Your information stays private and secure.
                    </Text>
                  </View>
                </Animated.View>
              </Animated.View>

              <Animated.View style={[styles.footer, rise(0.4)]}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>New here?</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  onPress={onBack}
                  style={({ pressed }) => [
                    styles.createButton,
                    pressed && styles.createButtonPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.createText}>Create an account</Text>
                </Pressable>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    overflow: "hidden",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  container: {
    width: "100%",
    maxWidth: 440,
    flexGrow: 1,
  },
  glowTop: {
    position: "absolute",
    top: -170,
    left: -60,
    width: 420,
    height: 400,
    borderRadius: 210,
    backgroundColor: C.glowA,
  },
  glowSide: {
    position: "absolute",
    top: 140,
    right: -190,
    width: 320,
    height: 340,
    borderRadius: 170,
    backgroundColor: C.glowB,
    opacity: 0.14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 36,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: "rgba(22, 18, 27, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  backButtonPressed: {
    borderColor: C.accent,
    transform: [{ scale: 0.94 }],
  },
  backChevron: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: C.text,
    transform: [{ rotate: "45deg" }],
    marginLeft: 4,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 36,
    height: 36,
    marginRight: 9,
  },
  brandName: {
    color: C.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  hero: {
    marginBottom: 30,
  },
  heroCompact: {
    marginBottom: 22,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(168, 106, 255, 0.35)",
    backgroundColor: "rgba(168, 106, 255, 0.12)",
    marginBottom: 16,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
    marginRight: 7,
  },
  badgeText: {
    color: C.buttonBorder,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  heading: {
    color: C.text,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "800",
    letterSpacing: -1.2,
    marginBottom: 12,
  },
  headingCompact: {
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    width: "100%",
    padding: 22,
    borderRadius: 25,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  cardTitle: {
    color: C.text,
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 7,
  },
  cardSubtitle: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 25,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  fieldLabel: {
    color: C.text,
    fontSize: 13,
    fontWeight: "600",
  },
  counter: {
    color: C.faint,
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  phoneInputContainer: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.fieldBorder,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 2,
  },
  countrySelector: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 12,
  },
  flag: {
    fontSize: 20,
  },
  callingCode: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 7,
  },
  inputDivider: {
    width: 1,
    height: 25,
    backgroundColor: C.fieldBorder,
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: C.text,
    fontSize: 16,
    letterSpacing: 0.8,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(74, 222, 155, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  check: {
    width: 6,
    height: 11,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: C.green,
    transform: [{ rotate: "45deg" }],
    marginTop: -3,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: C.fieldBorder,
    marginTop: 10,
    marginHorizontal: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  helperText: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 20,
  },
  errorText: {
    color: C.red,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 20,
  },
  continueButton: {
    minHeight: 55,
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: C.button,
    borderColor: C.buttonBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 13,
    elevation: 5,
  },
  continueButtonMuted: {
    opacity: 0.75,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 12,
  },
  arrowContainer: {
    width: 20,
    height: 16,
    justifyContent: "center",
  },
  arrowLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.text,
  },
  arrowHead: {
    position: "absolute",
    right: 3,
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: C.text,
    transform: [{ rotate: "45deg" }],
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 23,
  },
  lockContainer: {
    width: 14,
    height: 16,
    alignItems: "center",
    marginRight: 8,
  },
  lockTop: {
    width: 8,
    height: 7,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1.6,
    borderBottomWidth: 0,
    borderColor: C.muted,
  },
  lockBody: {
    width: 14,
    height: 9,
    borderRadius: 3,
    backgroundColor: C.muted,
  },
  securityText: {
    color: C.muted,
    fontSize: 11,
  },
  footer: {
    paddingTop: 28,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.cardBorder,
  },
  dividerText: {
    color: C.faint,
    fontSize: 11,
    marginHorizontal: 12,
  },
  createButton: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonPressed: {
    borderColor: C.accent,
    backgroundColor: "rgba(168, 106, 255, 0.08)",
  },
  createText: {
    color: C.accent,
    fontSize: 14,
    fontWeight: "700",
  },
});