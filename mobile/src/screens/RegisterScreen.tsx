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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CountryPicker, {
  Country,
  CountryCode,
  DARK_THEME,
} from "react-native-country-picker-modal";

interface RegisterScreenProps {
  onContinue: (details: {
    name: string;
    email: string;
    phone: string;
  }) => Promise<void>;
  onLogin: () => void;
}

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

export default function RegisterScreen({
  onContinue,
  onLogin,
}: RegisterScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("IN");
  const [callingCode, setCallingCode] = useState("91");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const breathe = useRef(new Animated.Value(0)).current;
  const focus = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

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

  const handleCountrySelect = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode?.[0] ?? "91");
    setError("");
  };

  const handleContinue = async () => {
    Keyboard.dismiss();
    setError("");

    const normalizedName = name.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2) {
      fail("Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      fail("Please enter a valid email address.");
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, "");
    const fullPhone = `+${callingCode}${normalizedPhone}`;

    if (!/^\+[1-9]\d{7,14}$/.test(fullPhone)) {
      fail("Enter a valid phone number, including the correct country code.");
      return;
    }

    try {
      setLoading(true);

      await onContinue({
        name: normalizedName,
        email: normalizedEmail,
        phone: fullPhone,
      });
    } catch (err: unknown) {
      fail(
        err instanceof Error
          ? err.message
          : "Unable to register. Please try again."
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
              <View style={styles.brandRow}>
                <Image
                  source={require("../../assets/miniledger-logo.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                  accessibilityLabel="MiniLedger logo"
                />
                <Text style={styles.brandName}>MiniLedger</Text>
              </View>

              <View style={styles.hero}>
                <Text style={styles.heading}>
                  Lending made a{"\n"}little simpler.
                </Text>

                <Text style={styles.subtitle}>
                  Keep track of who owes you, manage repayments, and stay on
                  top of every little detail.
                </Text>
              </View>

              <Animated.View
                style={[styles.card, { transform: [{ translateX: shake }] }]}
              >
                <Text style={styles.cardTitle}>Create your account</Text>

                <Text style={styles.cardSubtitle}>
                  Enter your details to register securely.
                </Text>

                <Text style={styles.fieldLabel}>Full name</Text>
                <TextInput
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    if (error) setError("");
                  }}
                  placeholder="Enter your full name"
                  placeholderTextColor={C.faint}
                  selectionColor={C.accent}
                  keyboardAppearance="dark"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  accessibilityLabel="Full name"
                  style={styles.basicInput}
                />

                <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                  Email address
                </Text>
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (error) setError("");
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={C.faint}
                  selectionColor={C.accent}
                  keyboardAppearance="dark"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  accessibilityLabel="Email address"
                  style={styles.basicInput}
                />

                <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                  Phone number
                </Text>

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
                  accessibilityLabel="Create account and continue"
                  accessibilityState={{
                    disabled: loading,
                    busy: loading,
                  }}
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

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  A little more clarity. A lot less remembering.
                </Text>
              </View>

              <Pressable
                onPress={onLogin}
                style={styles.signInButton}
                accessibilityRole="button"
              >
                <Text style={styles.signInText}>
                  Already have an account? Sign in
                </Text>
              </Pressable>
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
    paddingTop: 24,
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
    top: 60,
    right: -190,
    width: 320,
    height: 340,
    borderRadius: 170,
    backgroundColor: C.glowB,
    opacity: 0.14,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 42,
    height: 42,
    marginRight: 10,
  },
  brandName: {
    color: C.text,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  hero: {
    marginBottom: 30,
  },
  heading: {
    color: C.text,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 12,
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
  fieldLabel: {
    color: C.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 9,
  },
  fieldLabelSpaced: {
    marginTop: 20,
  },
  basicInput: {
    minHeight: 53,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.fieldBorder,
    backgroundColor: C.field,
    paddingHorizontal: 15,
    color: C.text,
    fontSize: 14,
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
    paddingLeft: 11,
    paddingRight: 8,
  },
  callingCode: {
    color: C.text,
    fontSize: 13,
    marginLeft: 5,
  },
  chevron: {
    width: 7,
    height: 7,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: C.muted,
    transform: [{ rotate: "45deg" }],
    marginLeft: 8,
    marginTop: -4,
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
    fontSize: 14,
  },
  helperText: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 20,
  },
  errorText: {
    color: C.red,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
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
  continueButtonDisabled: {
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
    alignItems: "center",
    paddingTop: 25,
    paddingBottom: 5,
  },
  footerText: {
    color: C.faint,
    fontSize: 11,
    textAlign: "center",
  },
  signInButton: {
    alignItems: "center",
    paddingVertical: 16,
  },
  signInText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: "600",
  },
});
