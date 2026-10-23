
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const C = {
  bg: "#09060E",
  card: "#16121B",
  border: "#30263C",
  accent: "#B98AFF",
  button: "#9A57F2",
  buttonLight: "#B477FF",
  text: "#FFFFFF",
  muted: "#A79DB4",
  faint: "#796C89",
  glow: "#7838C9",
};

type Props = {
onRegister: () => void;
onLogin: () => void;
};

export default function WelcomeScreen({
onRegister,
onLogin,
}: Props)  {
  const { height, width } = useWindowDimensions();
  const compact = height < 760;
  const smallWidth = width < 360;

  const ambient = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(0)).current;
  const registerPress = useRef(new Animated.Value(0)).current;
  const loginPress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ambientLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambient, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ambient, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    ambientLoop.start();
    pulseLoop.start();

    Animated.spring(entrance, {
      toValue: 1,
      damping: 19,
      stiffness: 85,
      mass: 0.9,
      useNativeDriver: true,
    }).start();

    return () => {
      ambientLoop.stop();
      pulseLoop.stop();
    };
  }, [ambient, entrance, logoPulse]);

  const glowOpacity = ambient.interpolate({
    inputRange: [0, 1],
    outputRange: [0.16, 0.34],
  });

  const glowScale = ambient.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.12],
  });

  const logoScale = logoPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });

  const entranceOpacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const entranceTranslate = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const createButtonScale = registerPress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.975],
  });

  const createButtonColor = registerPress.interpolate({
    inputRange: [0, 1],
    outputRange: [C.button, C.buttonLight],
  });

  const loginButtonOpacity = loginPress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.72],
  });

  const animatePress = (
  value: Animated.Value,
  toValue: number
) => {
  Animated.spring(value, {
    toValue,
    speed: 30,
    bounciness: 5,
    useNativeDriver: false,
  }).start();
};

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.screen}>
        {/* Animated ambient background */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.topGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.sideGlow,
            {
              opacity: glowOpacity,
              transform: [
                {
                  translateY: ambient.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -24],
                  }),
                },
              ],
            },
          ]}
        />

        <View pointerEvents="none" style={styles.bottomGlow} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              {
                minHeight: height,
                paddingHorizontal: smallWidth ? 22 : 26,
                paddingTop: compact ? 22 : 34,
                paddingBottom: compact ? 18 : 28,
              },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: entranceOpacity,
                  transform: [{ translateY: entranceTranslate }],
                },
              ]}
            >
              {/* Brand */}
              <View style={styles.brandSection}>
                <Animated.View
                  style={[
                    styles.logoGlow,
                    { transform: [{ scale: logoScale }] },
                  ]}
                >
                  <View style={styles.logo}>
                    <Text style={styles.logoText}>M</Text>
                  </View>
                </Animated.View>

                <Text style={styles.brand}>MiniLedger</Text>

                <View style={styles.brandTag}>
                  <View style={styles.brandDot} />
                  <Text style={styles.brandTagText}>
                    YOUR MONEY, MORE ORGANIZED
                  </Text>
                </View>
              </View>

              {/* Hero */}
              <View
                style={[
                  styles.hero,
                  { marginTop: compact ? 30 : 46 },
                ]}
              >
                <Text style={styles.eyebrow}>
                  SIMPLE. CLEAR. IN CONTROL.
                </Text>

                <Text
                  style={[
                    styles.heading,
                    {
                      fontSize: smallWidth ? 34 : compact ? 37 : 41,
                      lineHeight: smallWidth ? 41 : compact ? 45 : 49,
                    },
                  ]}
                >
                  Lending made{"\n"}
                  <Text style={styles.headingAccent}>
                    a little simpler.
                  </Text>
                </Text>

                <Text
                  style={[
                    styles.subtitle,
                    {
                      fontSize: smallWidth ? 14 : 15,
                      lineHeight: smallWidth ? 22 : 24,
                      marginTop: compact ? 14 : 18,
                    },
                  ]}
                >
                  Keep track of who owes you, manage repayments,
                  and stay on top of every little detail.
                </Text>
              </View>

              {/* Welcome card */}
              <View
                style={[
                  styles.cardOuter,
                  { marginTop: compact ? 26 : 36 },
                ]}
              >
                <View style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardIcon}>
                      <Text style={styles.cardIconText}>M</Text>
                    </View>

                    <View style={styles.secureBadge}>
                      <View style={styles.secureDot} />
                      <Text style={styles.secureText}>
                        SECURE ACCESS
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>
                    Welcome to{"\n"}MiniLedger
                  </Text>

                  <Text style={styles.cardSubtitle}>
                    Your lending journey starts here. Choose how
                    you’d like to continue.
                  </Text>

                  <Pressable
                    onPress={onRegister}
                    onPressIn={() => animatePress(registerPress, 1)}
                    onPressOut={() => animatePress(registerPress, 0)}
                    accessibilityRole="button"
                    accessibilityLabel="Create new account"
                    style={styles.buttonWrapper}
                  >
                    <Animated.View
                      style={[
                        styles.primaryButton,
                        {
                          backgroundColor: createButtonColor,
                          transform: [{ scale: createButtonScale }],
                        },
                      ]}
                    >
                      <Text style={styles.primaryText}>
                        Create New Account
                      </Text>

                      <View style={styles.buttonArrow}>
                        <View style={styles.arrowLine} />
                        <View style={styles.arrowHead} />
                      </View>
                    </Animated.View>
                  </Pressable>

                  <View style={styles.separator}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>OR</Text>
                    <View style={styles.separatorLine} />
                  </View>

                  <Pressable
                    onPress={onLogin}
                    onPressIn={() => animatePress(loginPress, 1)}
                    onPressOut={() => animatePress(loginPress, 0)}
                    accessibilityRole="button"
                    accessibilityLabel="Log in to existing account"
                    style={styles.buttonWrapper}
                  >
                    <Animated.View
                      style={[
                        styles.secondaryButton,
                        { opacity: loginButtonOpacity },
                      ]}
                    >
                      <Text style={styles.secondaryText}>
                        Already have an account?
                      </Text>
                      <Text style={styles.loginText}>Log in</Text>
                    </Animated.View>
                  </Pressable>

                  <View style={styles.cardFooter}>
                    <View style={styles.lockIcon}>
                      <View style={styles.lockArch} />
                      <View style={styles.lockBase} />
                    </View>

                    <Text style={styles.cardFooterText}>
                      Your information stays private and secure.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <View style={styles.footerLine} />

                <Text style={styles.footerText}>
                  A little more clarity. A lot less remembering.
                </Text>

                <Text style={styles.versionText}>
                  MADE FOR EVERYDAY CLARITY
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    overflow: "hidden",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  content: {
    width: "100%",
    maxWidth: 460,
    flexGrow: 1,
    justifyContent: "center",
  },

  topGlow: {
    position: "absolute",
    top: -180,
    alignSelf: "center",
    width: 440,
    height: 390,
    borderRadius: 220,
    backgroundColor: C.glow,
  },
  sideGlow: {
    position: "absolute",
    top: "34%",
    right: -220,
    width: 340,
    height: 380,
    borderRadius: 190,
    backgroundColor: "#54218B",
  },
  bottomGlow: {
    position: "absolute",
    bottom: -210,
    left: -140,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#30164A",
    opacity: 0.2,
  },

  brandSection: {
    alignItems: "center",
  },
  logoGlow: {
    padding: 5,
    borderRadius: 29,
    backgroundColor: "rgba(154, 87, 242, 0.12)",
    marginBottom: 13,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 23,
    backgroundColor: C.button,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    shadowColor: C.button,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 9,
  },
  logoText: {
    color: C.text,
    fontSize: 39,
    fontWeight: "900",
    letterSpacing: -1,
  },
  brand: {
    color: C.text,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.7,
    textAlign: "center",
  },
  brandTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(168, 106, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(168, 106, 255, 0.16)",
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C7A4FF",
    marginRight: 7,
  },
  brandTagText: {
    color: "#C6B2DE",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.35,
  },

  hero: {
    width: "100%",
  },
  eyebrow: {
    color: C.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  heading: {
    color: C.text,
    fontWeight: "900",
    letterSpacing: -1.35,
  },
  headingAccent: {
    color: "#C49AFF",
  },
  subtitle: {
    color: C.muted,
    fontWeight: "400",
    maxWidth: 420,
  },

  cardOuter: {
    width: "100%",
    borderRadius: 29,
    padding: 1,
    backgroundColor: "rgba(185, 138, 255, 0.23)",
    shadowColor: "#5B2A9A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.17,
    shadowRadius: 25,
    elevation: 7,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.045)",
    paddingHorizontal: 21,
    paddingTop: 22,
    paddingBottom: 18,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: "rgba(154, 87, 242, 0.17)",
    borderWidth: 1,
    borderColor: "rgba(185, 138, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: {
    color: "#D6B9FF",
    fontSize: 20,
    fontWeight: "900",
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.055)",
  },
  secureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8EE0B0",
    marginRight: 6,
  },
  secureText: {
    color: "#B9ADC9",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: C.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -0.65,
  },
  cardSubtitle: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 22,
  },

  buttonWrapper: {
    width: "100%",
  },
  primaryButton: {
    minHeight: 57,
    borderRadius: 17,
    backgroundColor: C.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    shadowColor: C.button,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryText: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    marginLeft: 18,
  },
  buttonArrow: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLine: {
    width: 10,
    height: 1.7,
    backgroundColor: C.text,
    position: "absolute",
    left: 5,
  },
  arrowHead: {
    position: "absolute",
    right: 6,
    width: 6,
    height: 6,
    borderTopWidth: 1.7,
    borderRightWidth: 1.7,
    borderColor: C.text,
    transform: [{ rotate: "45deg" }],
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.075)",
  },
  separatorText: {
    color: C.faint,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginHorizontal: 12,
  },
  secondaryButton: {
    minHeight: 49,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(168,106,255,0.22)",
    backgroundColor: "rgba(168,106,255,0.055)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  secondaryText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "500",
    marginRight: 5,
  },
  loginText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: "800",
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 19,
  },
  lockIcon: {
    width: 12,
    height: 14,
    alignItems: "center",
    marginRight: 7,
  },
  lockArch: {
    width: 7,
    height: 6,
    borderWidth: 1.2,
    borderBottomWidth: 0,
    borderColor: C.faint,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  lockBase: {
    width: 12,
    height: 8,
    borderRadius: 2,
    backgroundColor: C.faint,
  },

  cardFooterText: {
    color: C.faint,
    fontSize: 10,
  },
  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 30,
  },
  footerLine: {
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(168,106,255,0.5)",
    marginBottom: 15,
  },
  footerText: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  versionText: {
    color: "#655A73",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 10,
  },
});
