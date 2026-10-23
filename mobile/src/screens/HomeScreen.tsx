import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getDashboardSummary, getLoans } from "../api/ledger.api";
import type { DashboardSummary, LoanRecord } from "../api/ledger.api";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type HomeScreenProps = {
  userPhone?: string;
};

type Activity = {
  id: string;
  name: string;
  initials: string;
  note: string;
  amount: number;
  type: "in" | "out"; // in = repayment received, out = loan given
};


// Manual Indian digit grouping (12,34,567.00) so it never depends on
// Intl/locale support in the JS engine.
const formatMoney = (amount: number, decimals = 2) => {
  const negative = amount < 0;
  const [whole, fraction] = Math.abs(amount).toFixed(decimals).split(".");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`
    : last3;
  return `${negative ? "-" : ""}₹${grouped}${fraction ? `.${fraction}` : ""}`;
};

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

const C = {
  bg: "#09060E",
  glowA: "#5B2A9A",
  glowB: "#7B3FE4",
  card: "#16121B",
  cardBorder: "#2A2432",
  cardActive: "#251C33",
  accent: "#A86AFF",
  button: "#9A57F2",
  buttonBorder: "#B98AFF",
  dark: "#26222C",
  darkBorder: "#3A3442",
  text: "#FFFFFF",
  muted: "#A79DB4",
  faint: "#7B7088",
  green: "#17C98B",
  red: "#FF4D6A",
};

/* ------------------------------------------------------------------ */
/* Unique effect 1: glow card (press on phones, hover on web/desktop)  */
/* ------------------------------------------------------------------ */

type GlowCardProps = {
  onPress: () => void;
  style: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  baseBg: string;
  baseBorder: string;
  activeBg?: string;
  activeBorder?: string;
  label: string;
  children: React.ReactNode;
};

function GlowCard({
  onPress,
  style,
  containerStyle,
  baseBg,
  baseBorder,
  activeBg = C.cardActive,
  activeBorder = C.accent,
  label,
  children,
}: GlowCardProps) {
  // 0 = rest, 0.6 = hover, 1 = pressed
  const progress = useRef(new Animated.Value(0)).current;
  const hovered = useRef(false);

  const animateTo = (toValue: number) =>
    Animated.spring(progress, {
      toValue,
      speed: 28,
      bounciness: 7,
      useNativeDriver: false, // colour + shadow can't use the native driver
    }).start();

  const scale = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 1.015, 0.97],
    extrapolate: "clamp",
  });
  const borderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [baseBorder, activeBorder],
    extrapolate: "clamp",
  });
  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [baseBg, activeBg],
    extrapolate: "clamp",
  });
  const shadowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
    extrapolate: "clamp",
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(1)}
      onPressOut={() => animateTo(hovered.current ? 0.6 : 0)}
      onHoverIn={() => {
        hovered.current = true;
        animateTo(0.6);
      }}
      onHoverOut={() => {
        hovered.current = false;
        animateTo(0);
      }}
      style={containerStyle}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          style,
          {
            backgroundColor,
            borderColor,
            transform: [{ scale }],
            shadowColor: C.accent,
            shadowOpacity,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Unique effect 2: balance counts up when the screen opens            */
/* ------------------------------------------------------------------ */

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: v }) => setValue(v));
    Animated.timing(anim, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [target, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/* Icons drawn with Views (no icon font or extra package needed)       */
/* ------------------------------------------------------------------ */

const SearchIcon = () => (
  <View style={{ width: 22, height: 22 }}>
    <View
      style={{
        width: 15,
        height: 15,
        borderRadius: 8,
        borderWidth: 1.8,
        borderColor: C.text,
      }}
    />
    <View
      style={{
        position: "absolute",
        width: 8,
        height: 2,
        borderRadius: 1,
        backgroundColor: C.text,
        right: 0,
        bottom: 2,
        transform: [{ rotate: "45deg" }],
      }}
    />
  </View>
);

const BellIcon = () => (
  <View style={{ width: 22, height: 22, alignItems: "center" }}>
    <View
      style={{
        width: 14,
        height: 14,
        marginTop: 2,
        borderTopLeftRadius: 7,
        borderTopRightRadius: 7,
        borderWidth: 1.8,
        borderBottomWidth: 0,
        borderColor: C.text,
      }}
    />
    <View
      style={{
        width: 18,
        height: 2,
        borderRadius: 1,
        backgroundColor: C.text,
      }}
    />
    <View
      style={{
        width: 5,
        height: 3,
        marginTop: 1,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
        backgroundColor: C.text,
      }}
    />
  </View>
);

const PlusCircleIcon = () => (
  <View
    style={{
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: C.text,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <View style={{ position: "absolute", width: 9, height: 1.6, backgroundColor: C.text }} />
    <View style={{ position: "absolute", width: 1.6, height: 9, backgroundColor: C.text }} />
  </View>
);

const WalletIcon = () => (
  <View style={{ width: 22, height: 18, justifyContent: "center" }}>
    <View
      style={{
        height: 16,
        borderRadius: 4,
        borderWidth: 1.6,
        borderColor: C.text,
      }}
    />
    <View
      style={{
        position: "absolute",
        right: 0,
        width: 9,
        height: 7,
        borderRadius: 2.5,
        borderWidth: 1.6,
        borderColor: C.text,
        backgroundColor: C.button,
      }}
    />
  </View>
);

const PeopleIcon = () => (
  <View style={{ width: 26, height: 26, alignItems: "center" }}>
    <View
      style={{
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: C.text,
        marginTop: 2,
      }}
    />
    <View
      style={{
        width: 22,
        height: 10,
        marginTop: 3,
        borderTopLeftRadius: 11,
        borderTopRightRadius: 11,
        backgroundColor: C.text,
      }}
    />
  </View>
);

const BarsIcon = () => (
  <View
    style={{
      width: 26,
      height: 26,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    }}
  >
    {[12, 22, 17].map((h, i) => (
      <View
        key={i}
        style={{ width: 6, height: h, borderRadius: 2, backgroundColor: C.text }}
      />
    ))}
  </View>
);

const ClockIcon = () => (
  <View
    style={{
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2.2,
      borderColor: C.text,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <View
      style={{
        position: "absolute",
        width: 2,
        height: 8,
        top: 4,
        borderRadius: 1,
        backgroundColor: C.text,
      }}
    />
    <View
      style={{
        position: "absolute",
        width: 7,
        height: 2,
        left: 11,
        top: 11,
        borderRadius: 1,
        backgroundColor: C.text,
      }}
    />
  </View>
);

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

function HomeScreenContent({ userPhone }: HomeScreenProps) {
  const insets = useSafeAreaInsets();

  // Live dashboard data. UI and styles below remain unchanged.
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalLent: "0",
    totalRepaid: "0",
    overdueAmount: "0",
  });

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [summaryData, loanData] = await Promise.all([
          getDashboardSummary(),
          getLoans(),
        ]);

        if (active) {
          setSummary(summaryData);
          setLoans(loanData);
        }
      } catch (error) {
        if (active) {
          Alert.alert(
            "Couldn't load dashboard",
            "Please check your connection and try again."
          );
        }
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const { totalToCollect, collected, percent } = useMemo(() => {
    const lent = Number(summary.totalLent) || 0;
    const outstanding = loans
      .filter((loan) => loan.status === "pending")
      .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0);
    const received = Number(summary.totalRepaid) || 0;

    return {
      totalToCollect: outstanding,
      collected: received,
      percent: lent > 0 ? (received / lent) * 100 : 0,
    };
  }, [loans, summary]);

  const recentActivity = useMemo<Activity[]>(() => {
    return loans.slice(0, 3).map((loan) => {
      const repaid = loan.status === "repaid";
      const initials = loan.friendName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

      return {
        id: loan.id,
        name: loan.friendName,
        initials,
        note: repaid
          ? `Loan repaid · ${loan.repaidAt ? new Date(loan.repaidAt).toLocaleDateString() : "Completed"}`
          : `Loan · Due ${loan.dueDate}`,
        amount: Number(loan.amount) || 0,
        type: repaid ? "in" : "out",
      };
    });
  }, [loans]);

  const animatedTotal = useCountUp(totalToCollect);

  // Unique effect 3: the purple glow behind the header slowly breathes
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

  const showComingSoon = (feature: string) => {
    Alert.alert(
      feature,
      `${feature} will be connected to your MiniLedger data in the next step.`
    );
  };

  const quickAccess = [
    { key: "Borrowers", lines: "My\nborrowers", icon: <PeopleIcon /> },
    { key: "Reports", lines: "Loan\nreports", icon: <BarsIcon /> },
    { key: "Reminders", lines: "Due\nreminders", icon: <ClockIcon /> },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.screen}>
        {/* Ambient purple light, matches the reference's purple-to-black fade */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowTop,
            { opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]}
        />
        <View pointerEvents="none" style={styles.glowSide} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.profile}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>M</Text>
                </View>
                <View style={styles.profileText}>
                  <Text style={styles.name}>MiniLedger</Text>
                  <Text style={styles.subName} numberOfLines={1}>
                    {userPhone ? `Phone: ${userPhone}` : "Your personal ledger"}
                  </Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <GlowCard
                  onPress={() => showComingSoon("Search")}
                  label="Search loans"
                  style={styles.roundButton}
                  baseBg="rgba(255,255,255,0.10)"
                  baseBorder="rgba(255,255,255,0.14)"
                  activeBg="rgba(168,106,255,0.28)"
                >
                  <SearchIcon />
                </GlowCard>
                <GlowCard
                  onPress={() => showComingSoon("Notifications")}
                  label="Notifications"
                  style={styles.roundButton}
                  baseBg="rgba(255,255,255,0.10)"
                  baseBorder="rgba(255,255,255,0.14)"
                  activeBg="rgba(168,106,255,0.28)"
                >
                  <BellIcon />
                </GlowCard>
              </View>
            </View>

            {/* Snapshot */}
            <View style={styles.snapshot}>
              <Text style={styles.snapshotLabel}>Lending Snapshot</Text>
              <Text
                style={styles.snapshotAmount}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {formatMoney(animatedTotal)}
              </Text>
              <Text style={styles.snapshotChange}>
                +{formatMoney(collected, 0)} collected ({percent.toFixed(1)}%)
              </Text>
            </View>

            {/* Primary actions */}
            <View style={styles.actionsRow}>
              <GlowCard
                onPress={() => showComingSoon("Add Loan")}
                label="Add loan"
                containerStyle={styles.actionContainer}
                style={styles.actionButton}
                baseBg={C.dark}
                baseBorder={C.darkBorder}
                activeBg="#33293F"
              >
                <PlusCircleIcon />
                <Text style={styles.actionText}>Add loan</Text>
              </GlowCard>

              <GlowCard
                onPress={() => showComingSoon("Record Repayment")}
                label="Record repayment"
                containerStyle={styles.actionContainer}
                style={styles.actionButton}
                baseBg={C.button}
                baseBorder={C.buttonBorder}
                activeBg="#B27AFF"
                activeBorder="#FFFFFF"
              >
                <WalletIcon />
                <Text style={styles.actionText}>Repayment</Text>
              </GlowCard>
            </View>

            {/* Quick access */}
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickRow}>
              {quickAccess.map((q) => (
                <GlowCard
                  key={q.key}
                  onPress={() => showComingSoon(q.key)}
                  label={q.lines.replace("\n", " ")}
                  containerStyle={styles.quickContainer}
                  style={styles.quickCard}
                  baseBg={C.card}
                  baseBorder={C.cardBorder}
                >
                  <View style={styles.quickIcon}>{q.icon}</View>
                  <Text style={styles.quickText}>{q.lines}</Text>
                </GlowCard>
              ))}
            </View>

            {/* Recent activity */}
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Recent Activity</Text>
              <Pressable
                onPress={() => showComingSoon("All Activity")}
                accessibilityRole="button"
                accessibilityLabel="See all activity"
                hitSlop={10}
              >
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>

            <View style={styles.list}>
              {recentActivity.map((a) => {
                const incoming = a.type === "in";
                return (
                  <GlowCard
                    key={a.id}
                    onPress={() => showComingSoon(`${a.name}'s activity`)}
                    label={`${a.name}, ${incoming ? "received" : "lent"} ${formatMoney(
                      a.amount
                    )}`}
                    style={styles.row}
                    baseBg={C.card}
                    baseBorder={C.cardBorder}
                  >
                    <View style={styles.rowIcon}>
                      <Text style={styles.rowIconText}>{a.initials}</Text>
                    </View>

                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {a.name}
                      </Text>
                      <Text style={styles.rowNote} numberOfLines={1}>
                        {a.note}
                      </Text>
                    </View>

                    <View style={styles.rowRight}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: incoming ? C.green : C.red },
                        ]}
                      />
                      <Text style={styles.rowAmount} numberOfLines={1}>
                        {incoming ? "+" : "-"}
                        {formatMoney(a.amount)}
                      </Text>
                    </View>
                  </GlowCard>
                );
              })}
            </View>
          </View>
        </ScrollView>
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
  scrollView: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
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

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 34,
  },
  profile: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4A3561",
    borderWidth: 1,
    borderColor: "#8A68A8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#F5E9FF", fontSize: 18, fontWeight: "700" },
  profileText: { flex: 1, minWidth: 0 },
  name: { color: C.text, fontSize: 17, fontWeight: "700" },
  subName: { color: C.muted, fontSize: 12, marginTop: 3 },
  headerActions: { flexDirection: "row", gap: 10, marginLeft: 10 },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Snapshot */
  snapshot: { alignItems: "center", marginBottom: 28 },
  snapshotLabel: { color: "#E6DDF0", fontSize: 14, marginBottom: 10 },
  snapshotAmount: {
    width: "100%",
    color: C.text,
    fontSize: 46,
    fontWeight: "700",
    letterSpacing: -1,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  snapshotChange: { color: C.muted, fontSize: 13, marginTop: 8 },

  /* Actions */
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 30 },
  actionContainer: { flex: 1 },
  actionButton: {
    minHeight: 54,
    borderRadius: 27,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  actionText: { color: C.text, fontSize: 14, fontWeight: "600" },

  /* Quick access */
  sectionTitle: {
    color: C.text,
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 14,
  },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 32 },
  quickContainer: { flex: 1 },
  quickCard: {
    minHeight: 122,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  quickIcon: { height: 28, justifyContent: "center" },
  quickText: {
    color: "#E9E2F0",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },

  /* Activity list */
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  listTitle: { color: C.text, fontSize: 18, fontWeight: "700" },
  seeAll: { color: "#D9C2FF", fontSize: 13, fontWeight: "500" },
  list: { gap: 12 },
  row: {
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#2A2433",
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconText: { color: "#DCC4F6", fontSize: 14, fontWeight: "700" },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { color: C.text, fontSize: 16, fontWeight: "600" },
  rowNote: { color: C.faint, fontSize: 12, marginTop: 5 },
  rowRight: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowAmount: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});

// Keep the safe-area context available even if App.tsx does not provide one.
export default function HomeScreen(props: HomeScreenProps) {
  return (
    <SafeAreaProvider>
      <HomeScreenContent {...props} />
    </SafeAreaProvider>
  );
}
