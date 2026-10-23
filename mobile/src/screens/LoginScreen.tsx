import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CountryPicker, {
  Country,
  CountryCode,
  DARK_THEME,
} from "react-native-country-picker-modal";

interface LoginScreenProps {
  onContinue: (phone: string) => Promise<void>;
}

/* Same palette as HomeScreen so the two screens feel like one app. */
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
};

/* ------------------------------------------------------------------ */
/* Icons drawn with Views (no icon font needed)                        */
/* ------------------------------------------------------------------ */

const ArrowIcon = () => (
  <View style={{ width: 20, height: 16, justifyContent: "center" }}>
    <View
      style={{
        width: 16,
        height: 2,
        borderRadius: 1,
        backgroundColor: C.text,
      }}
    />
    <View
      style={{
        position: "absolute",
        right: 3,
        width: 9,
        height: 9,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderColor: C.text,
        transform: [{ rotate: "45deg" }],
      }}
    />
  </View>
);

const LockIcon = () => (
  <View style={{ width: 14, height: 16, alignItems: "center" }}>
    <View
      style={{
        width: 8,
        height: 7,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        borderWidth: 1.6,
        borderBottomWidth: 0,
        borderColor: C.muted,
      }}
    />
    <View
      style={{
        width: 14,
        height: 9,
        borderRadius: 3,
        backgroundColor: C.muted,
      }}
    />
  </View>
);

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function LoginScreen({ onContinue }: LoginScreenProps) {
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("IN");
  const [callingCode, setCallingCode] = useState("91");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Effect 1: the purple light behind the brand slowly breathes */
  const breathe = useRef(new Animated.Value(0)).current;
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
    return () => loop.stop();
  }, [breathe]);

  const glowOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.5],
  });
  const glowScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  /* Effect 2: the phone field lights up with a purple glow on focus */
  const focus = useRef(new Animated.Value(0)).current;
  const animateFocus = (toValue: number) =>
    Animated.timing(focus, {
      toValue,
      duration: 180,
      useNativeDriver: false,
    }).start();

  const fieldBorder = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [C.fieldBorder, C.accent],
  });
  const fieldGlow = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  /* Effect 3: the card gives a quick shake when something goes wrong */
  const shake = useRef(new Animated.Value(0)).current;
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

  /* Continue button: springs down on press with a glowing border */
  const press = useRef(new Animated.Value(0)).current;
  const animatePress = (toValue: number) =>
    Animated.spring(press, {
      toValue,
      speed: 28,
      bounciness: 7,
      useNativeDriver: false,
    }).start();

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

  /* Logic (unchanged) */
  const handleCountrySelect = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode?.[0] ?? "91");
    setError("");
  };

  const handleContinue = async () => {
    Keyboard.dismiss();
    setError("");

    const normalizedPhone = phone.replace(/\D/g, "");
    const fullPhone = `+${callingCode}${normalizedPhone}`;

    // Matches the international phone format accepted by the backend.
    if (!/^\+[1-9]\d{7,14}$/.test(fullPhone)) {
      fail("Enter a valid phone number, including the correct country code.");
      return;
    }

    try {
      setLoading(true);
      await onContinue(fullPhone);
    } catch (err: unknown) {
      fail(
        err instanceof Error
          ? err.message
          : "Unable to continue. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.screen}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowTop,
            { opacity: glowOpacity, transform: [{ scale: glowScale }] },
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
              {/* Brand */}
              <View style={styles.brandRow}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>M</Text>
                </View>
                <Text style={styles.brandName}>MiniLedger</Text>
              </View>

              {/* Intro */}
              <View style={styles.hero}>
                <Text style={styles.heading}>
                  Lending made a{"\n"}little simpler.
                </Text>
                <Text style={styles.subtitle}>
                  Keep track of who owes you, manage repayments, and stay on
                  top of every little detail.
                </Text>
              </View>

              {/* Login card */}
              <Animated.View
                style={[styles.card, { transform: [{ translateX: shake }] }]}
              >
                <Text style={styles.cardTitle}>Welcome back</Text>
                <Text style={styles.cardSubtitle}>
                  Enter your phone number to get started.
                </Text>

                <Text style={styles.fieldLabel}>Phone number</Text>

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
                    <CountryPicker
                      countryCode={countryCode}
                      withFilter
                      withFlag
                      withEmoji
                      withCallingCode={false}
                      withCountryNameButton={false}
                      withAlphaFilter
                      onSelect={handleCountrySelect}
                      theme={{
                        ...DARK_THEME,
                        backgroundColor: C.card,
                        onBackgroundTextColor: C.text,
                        filterPlaceholderTextColor: C.faint,
                      }}
                    />
                    <Text style={styles.callingCode}>+{callingCode}</Text>
                    <View style={styles.chevron} />
                  </View>

                  <View style={styles.inputDivider} />

                  <TextInput
                    value={phone}
                    onChangeText={(value) => {
                      setPhone(value.replace(/[^\d\s()-]/g, ""));
                      if (error) setError("");
                    }}
                    onFocus={() => animateFocus(1)}
                    onBlur={() => animateFocus(0)}
                    placeholder="Phone number"
                    placeholderTextColor={C.faint}
                    selectionColor={C.accent}
                    keyboardAppearance="dark"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    autoCorrect={false}
                    maxLength={20}
                    style={styles.phoneInput}
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                    accessibilityLabel="Phone number"
                  />
                </Animated.View>

                {error ? (
                  <Text accessibilityRole="alert" style={styles.errorText}>
                    {error}
                  </Text>
                ) : (
                  <Text style={styles.helperText}>
                    We’ll send you a one-time verification code.
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
                  accessibilityLabel="Continue with phone number"
                  accessibilityState={{ disabled: loading, busy: loading }}
                >
                  <Animated.View
                    style={[
                      styles.continueButton,
                      loading && styles.continueButtonDisabled,
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

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  A little more clarity. A lot less remembering.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, backgroundColor: C.bg, overflow: "hidden" },
  keyboardContainer: { flex: 1 },
  scrollView: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  container: { width: "100%", maxWidth: 440, flexGrow: 1 },

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
    top: 60,
    right: -190,
    width: 320,
    height: 340,
    borderRadius: 170,
    backgroundColor: C.glowB,
    opacity: 0.14,
  },

  /* Brand */
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 38,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4A3561",
    borderWidth: 1,
    borderColor: "#8A68A8",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#F5E9FF", fontSize: 20, fontWeight: "800" },
  brandName: {
    color: C.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  /* Hero */
  hero: { width: "100%", marginBottom: 30 },
  heading: {
    color: C.text,
    fontSize: 38,
    lineHeight: 45,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  subtitle: {
    color: C.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    maxWidth: 360,
  },

  /* Card */
  card: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  cardTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 26,
  },
  fieldLabel: {
    color: "#E6DDF0",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },

  /* Phone field */
  phoneInputContainer: {
    width: "100%",
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: C.field,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 5,
    paddingRight: 10,
  },
  callingCode: { color: C.text, fontSize: 14, fontWeight: "700" },
  chevron: {
    width: 7,
    height: 7,
    marginLeft: 3,
    marginTop: -3,
    borderRightWidth: 1.6,
    borderBottomWidth: 1.6,
    borderColor: C.muted,
    transform: [{ rotate: "45deg" }],
  },
  inputDivider: {
    width: 1,
    height: 26,
    backgroundColor: C.fieldBorder,
    marginRight: 12,
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    height: 54,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: C.text,
    fontSize: 16,
  },

  helperText: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 22,
  },
  errorText: {
    color: "#FF8498",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 22,
  },

  /* Continue button */
  continueButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    gap: 12,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 5,
  },
  continueButtonDisabled: { opacity: 0.7 },
  continueButtonText: { color: C.text, fontSize: 15, fontWeight: "700" },

  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 20,
  },
  securityText: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },

  footer: { width: "100%", alignItems: "center", marginTop: 30 },
  footerText: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },
});
