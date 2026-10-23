import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { archiveLoan, createLoan, getArchivedLoans, getDashboardSummary, getLoans, repayLoan, restoreLoan } from "../api/ledger.api";
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
  const [addLoanVisible, setAddLoanVisible] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  });
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [savingLoan, setSavingLoan] = useState(false);
  const [repaymentVisible, setRepaymentVisible] = useState(false);
  const [repayingLoanId, setRepayingLoanId] = useState<string | null>(null);
  const [archivedLoans, setArchivedLoans] = useState<LoanRecord[]>([]);
  const [archivedLoansVisible, setArchivedLoansVisible] = useState(false);
  const [archivingLoanId, setArchivingLoanId] = useState<string | null>(null);
  const [restoringLoanId, setRestoringLoanId] = useState<string | null>(null);

  // Feature panels reuse the existing modal/card styles; the dashboard UI stays unchanged.
  const [borrowersVisible, setBorrowersVisible] = useState(false);
  const [reportsVisible, setReportsVisible] = useState(false);
  const [remindersVisible, setRemindersVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [activityVisible, setActivityVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const borrowers = useMemo(() => {
    const grouped = new Map<string, {
      name: string;
      totalLent: number;
      pendingAmount: number;
      loanCount: number;
      pendingCount: number;
    }>();

    for (const loan of loans) {
      const name = loan.friendName.trim();
      const key = name.toLowerCase();
      const borrower = grouped.get(key) ?? {
        name,
        totalLent: 0,
        pendingAmount: 0,
        loanCount: 0,
        pendingCount: 0,
      };
      const amount = Number(loan.amount) || 0;
      borrower.totalLent += amount;
      borrower.loanCount += 1;
      if (loan.status === "pending") {
        borrower.pendingAmount += amount;
        borrower.pendingCount += 1;
      }
      grouped.set(key, borrower);
    }

    return Array.from(grouped.values()).sort((a, b) => b.pendingAmount - a.pendingAmount);
  }, [loans]);

  const getDueDate = (value: string) => {
    // Backend stores YYYY-MM-DD. Construct local date to avoid UTC date shifts.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return new Date(value);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };

  const dueSoonLoans = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return loans.filter((loan) => {
      if (loan.status !== "pending") return false;
      const due = getDueDate(loan.dueDate);
      due.setHours(0, 0, 0, 0);
      return due >= today && due <= nextWeek;
    }).sort((a, b) => getDueDate(a.dueDate).getTime() - getDueDate(b.dueDate).getTime());
  }, [loans]);

  const overdueLoans = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return loans.filter((loan) => {
      if (loan.status !== "pending") return false;
      const due = getDueDate(loan.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).sort((a, b) => getDueDate(a.dueDate).getTime() - getDueDate(b.dueDate).getTime());
  }, [loans]);

  const searchedLoans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return loans;
    return loans.filter((loan) =>
      loan.friendName.toLowerCase().includes(query) ||
      loan.status.toLowerCase().includes(query) ||
      loan.dueDate.includes(query) ||
      String(loan.amount).includes(query)
    );
  }, [loans, searchQuery]);

  const notificationItems = useMemo(() => {
    const items: { id: string; title: string; detail: string; overdue: boolean }[] = [];
    overdueLoans.forEach((loan) => items.push({
      id: `overdue-${loan.id}`,
      title: `${loan.friendName} is overdue`,
      detail: `${formatMoney(Number(loan.amount) || 0)} · Due ${loan.dueDate}`,
      overdue: true,
    }));
    dueSoonLoans.forEach((loan) => items.push({
      id: `due-${loan.id}`,
      title: `${loan.friendName}'s loan is due soon`,
      detail: `${formatMoney(Number(loan.amount) || 0)} · Due ${loan.dueDate}`,
      overdue: false,
    }));
    return items;
  }, [overdueLoans, dueSoonLoans]);

  const refreshDashboard = async () => {
    const [summaryData, loanData] = await Promise.all([
      getDashboardSummary(),
      getLoans(),
    ]);
    setSummary(summaryData);
    setLoans(loanData);
  };

  const loadArchivedLoans = async () => {
    const archived = await getArchivedLoans();
    setArchivedLoans(archived);
  };

  const handleArchiveLoan = (loan: LoanRecord) => {
    const isRepaid = loan.status === "repaid";
    Alert.alert(
      isRepaid ? "Archive repaid loan?" : "Archive loan?",
      isRepaid
        ? `This loan for ${loan.friendName} is marked as repaid. Archive it from your active ledger? You can restore it later.`
        : `Archive ${loan.friendName}'s loan of ${formatMoney(Number(loan.amount) || 0)}? You can restore it later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setArchivingLoanId(loan.id);
                await archiveLoan(loan.id);
                await refreshDashboard();
                Alert.alert("Loan archived", "The loan was moved out of your active ledger.");
              } catch (error: any) {
                const message = error?.response?.data?.message;
                Alert.alert("Couldn't archive loan", typeof message === "string" ? message : "Please check your connection and try again.");
              } finally {
                setArchivingLoanId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const handleOpenArchivedLoans = async () => {
    try {
      await loadArchivedLoans();
      setArchivedLoansVisible(true);
    } catch (error: any) {
      const message = error?.response?.data?.message;
      Alert.alert("Couldn't load archived loans", typeof message === "string" ? message : "Please check your connection and try again.");
    }
  };

  const handleRestoreLoan = (loan: LoanRecord) => {
    Alert.alert(
      "Restore loan?",
      `Restore ${loan.friendName}'s loan to your active ledger?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: () => {
            void (async () => {
              try {
                setRestoringLoanId(loan.id);
                await restoreLoan(loan.id);
                await Promise.all([refreshDashboard(), loadArchivedLoans()]);
                Alert.alert("Loan restored", "The loan is back in your active ledger.");
              } catch (error: any) {
                const message = error?.response?.data?.message;
                Alert.alert("Couldn't restore loan", typeof message === "string" ? message : "Please check your connection and try again.");
              } finally {
                setRestoringLoanId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const handleCreateLoan = async () => {
    const trimmedName = friendName.trim();
    const parsedAmount = Number(loanAmount);
    const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dueDate.trim());
    const day = dateMatch ? Number(dateMatch[1]) : 0;
    const month = dateMatch ? Number(dateMatch[2]) : 0;
    const year = dateMatch ? Number(dateMatch[3]) : 0;
    const parsedDate = new Date(year, month - 1, day);
    const validDate = Boolean(dateMatch) && year >= 1900 &&
      parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day;
    const apiDueDate = validDate ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";

    if (!trimmedName) {
      Alert.alert("Borrower required", "Enter the borrower's name.");
      return;
    }
    if (!loanAmount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a loan amount greater than zero.");
      return;
    }
    if (!validDate) {
      Alert.alert("Invalid due date", "Enter the due date as DD/MM/YYYY, or choose it from the calendar.");
      return;
    }

    try {
      setSavingLoan(true);
      await createLoan({ friendName: trimmedName, amount: parsedAmount, dueDate: apiDueDate });
      await refreshDashboard();
      setAddLoanVisible(false);
      setFriendName("");
      setLoanAmount("");
      Alert.alert("Loan added", `Loan for ${trimmedName} was saved successfully.`);
    } catch (error: any) {
      const message = error?.response?.data?.message;
      Alert.alert("Couldn't add loan", typeof message === "string" ? message : "Please check your connection and try again.");
    } finally {
      setSavingLoan(false);
    }
  };

  const handleRepayLoan = (loan: LoanRecord) => {
    Alert.alert(
      "Confirm repayment",
      `Mark ${loan.friendName}'s loan of ${formatMoney(Number(loan.amount) || 0)} as fully repaid?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm repayment",
          onPress: () => {
            void (async () => {
              try {
                setRepayingLoanId(loan.id);
                await repayLoan(loan.id);
                await refreshDashboard();
                Alert.alert("Repayment recorded", `${loan.friendName}'s loan is now marked as repaid.`);
                if (loans.filter((item) => item.status === "pending" && item.id !== loan.id).length === 0) {
                  setRepaymentVisible(false);
                }
              } catch (error: any) {
                const message = error?.response?.data?.message;
                Alert.alert("Couldn't record repayment", typeof message === "string" ? message : "Please check your connection and try again.");
              } finally {
                setRepayingLoanId(null);
              }
            })();
          },
        },
      ]
    );
  };

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

  const openQuickFeature = (feature: string) => {
    if (feature === "Borrowers") setBorrowersVisible(true);
    else if (feature === "Reports") setReportsVisible(true);
    else if (feature === "Reminders") setRemindersVisible(true);
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
                  onPress={() => { setSearchQuery(""); setSearchVisible(true); }}
                  label="Search loans"
                  style={styles.roundButton}
                  baseBg="rgba(255,255,255,0.10)"
                  baseBorder="rgba(255,255,255,0.14)"
                  activeBg="rgba(168,106,255,0.28)"
                >
                  <SearchIcon />
                </GlowCard>
                <GlowCard
                  onPress={() => setNotificationsVisible(true)}
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
                onPress={() => setAddLoanVisible(true)}
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
                onPress={() => setRepaymentVisible(true)}
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
                  onPress={() => openQuickFeature(q.key)}
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
                onPress={() => setActivityVisible(true)}
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
                    onPress={() => { setSearchQuery(a.name); setSearchVisible(true); }}
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

      <Modal
        visible={addLoanVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddLoanVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add loan</Text>
            <Text style={styles.modalSubtitle}>Enter the loan details below.</Text>

            <Text style={styles.fieldLabel}>Borrower name</Text>
            <TextInput
              value={friendName}
              onChangeText={setFriendName}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={C.faint}
              autoCapitalize="words"
              returnKeyType="next"
              style={styles.formInput}
            />

            <Text style={styles.fieldLabel}>Loan amount (₹)</Text>
            <TextInput
              value={loanAmount}
              onChangeText={setLoanAmount}
              placeholder="e.g. 1500"
              placeholderTextColor={C.faint}
              keyboardType="decimal-pad"
              style={styles.formInput}
            />

            <Text style={styles.fieldLabel}>Due date (DD/MM/YYYY)</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                value={dueDate}
                onChangeText={(value) => {
                  const digits = value.replace(/\D/g, "").slice(0, 8);
                  const formatted = digits.length <= 2 ? digits : digits.length <= 4
                    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                    : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
                  setDueDate(formatted);
                }}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={C.faint}
                keyboardType="number-pad"
                maxLength={10}
                style={[styles.formInput, styles.dateTextInput]}
              />
              <Pressable
                onPress={() => {
                  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dueDate);
                  if (match) setCalendarMonth(new Date(Number(match[3]), Number(match[2]) - 1, 1));
                  setCalendarVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Choose due date from calendar"
                style={styles.calendarButton}
              >
                <Text style={styles.calendarButtonIcon}>▦</Text>
              </Pressable>
            </View>
            <Text style={styles.dateHint}>Type a date or choose one from the calendar.</Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setAddLoanVisible(false)}
                disabled={savingLoan}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleCreateLoan()}
                disabled={savingLoan}
                style={[styles.modalButton, styles.saveButton, savingLoan && styles.disabledButton]}
              >
                <Text style={styles.modalButtonText}>{savingLoan ? "Saving..." : "Save loan"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={repaymentVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRepaymentVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record repayment</Text>
            <Text style={styles.modalSubtitle}>Select a pending loan to mark it fully repaid.</Text>

            {loans.filter((loan) => loan.status === "pending").length === 0 ? (
              <Text style={styles.emptyRepaymentText}>No pending loans to repay.</Text>
            ) : (
              <ScrollView style={styles.repaymentList} showsVerticalScrollIndicator={false}>
                {loans.filter((loan) => loan.status === "pending").map((loan) => (
                  <View key={loan.id} style={styles.repaymentRow}>
                    <View style={styles.repaymentInfo}>
                      <Text style={styles.repaymentName} numberOfLines={1}>{loan.friendName}</Text>
                      <Text style={styles.repaymentAmount}>{formatMoney(Number(loan.amount) || 0)}</Text>
                      <Text style={styles.repaymentDue}>Due: {loan.dueDate}</Text>
                    </View>
                    <Pressable
                      onPress={() => handleRepayLoan(loan)}
                      disabled={repayingLoanId !== null}
                      style={[styles.repayButton, repayingLoanId === loan.id && styles.disabledButton]}
                    >
                      <Text style={styles.repayButtonText}>{repayingLoanId === loan.id ? "Saving..." : "Mark repaid"}</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setRepaymentVisible(false)}
                disabled={repayingLoanId !== null}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={borrowersVisible} transparent animationType="fade" onRequestClose={() => setBorrowersVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>My Borrowers</Text>
            <Text style={styles.modalSubtitle}>Your lending overview, grouped by borrower.</Text>
            {borrowers.length === 0 ? (
              <Text style={styles.emptyRepaymentText}>No borrowers yet. Add a loan to get started.</Text>
            ) : (
              <ScrollView style={styles.repaymentList} showsVerticalScrollIndicator={false}>
                {borrowers.map((borrower) => (
                  <View key={borrower.name.toLowerCase()} style={styles.repaymentRow}>
                    <View style={styles.repaymentInfo}>
                      <Text style={styles.repaymentName} numberOfLines={1}>{borrower.name}</Text>
                      <Text style={styles.repaymentDue}>
                        {borrower.loanCount} {borrower.loanCount === 1 ? "loan" : "loans"} · {borrower.pendingCount > 0 ? `${borrower.pendingCount} pending` : "All settled"}
                      </Text>
                      <Text style={styles.repaymentAmount}>Pending: {formatMoney(borrower.pendingAmount)}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.repaymentName}>{formatMoney(borrower.totalLent)}</Text>
                      <Text style={styles.repaymentDue}>Total lent</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setBorrowersVisible(false)} style={[styles.modalButton, styles.saveButton]}><Text style={styles.modalButtonText}>Close</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reportsVisible} transparent animationType="fade" onRequestClose={() => setReportsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Loan Reports</Text>
            <Text style={styles.modalSubtitle}>A summary calculated from your saved loans.</Text>
            <View style={styles.reportRow}><Text style={styles.reportLabel}>Total lent</Text><Text style={styles.reportValue}>{formatMoney(Number(summary.totalLent) || 0)}</Text></View>
            <View style={styles.reportRow}><Text style={styles.reportLabel}>Marked as repaid</Text><Text style={styles.reportValue}>{formatMoney(Number(summary.totalRepaid) || 0)}</Text></View>
            <View style={styles.reportRow}><Text style={styles.reportLabel}>Pending collection</Text><Text style={styles.reportValue}>{formatMoney(totalToCollect)}</Text></View>
            <View style={styles.reportRow}><Text style={styles.reportLabel}>Overdue amount</Text><Text style={[styles.reportValue, { color: overdueLoans.length ? C.red : C.green }]}>{formatMoney(Number(summary.overdueAmount) || 0)}</Text></View>
            <View style={styles.reportRow}><Text style={styles.reportLabel}>Borrowers</Text><Text style={styles.reportValue}>{borrowers.length}</Text></View>
            <View style={styles.reportRow}><Text style={styles.reportLabel}>Pending loans</Text><Text style={styles.reportValue}>{loans.filter((loan) => loan.status === "pending").length}</Text></View>
            <View style={styles.reportRow}><Text style={styles.reportLabel}>Repaid loans</Text><Text style={styles.reportValue}>{loans.filter((loan) => loan.status === "repaid").length}</Text></View>
            <View style={styles.modalActions}><Pressable onPress={() => setReportsVisible(false)} style={[styles.modalButton, styles.saveButton]}><Text style={styles.modalButtonText}>Close</Text></Pressable></View>
          </View>
        </View>
      </Modal>

      <Modal visible={remindersVisible} transparent animationType="fade" onRequestClose={() => setRemindersVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Due Reminders</Text>
            <Text style={styles.modalSubtitle}>Pending loans overdue or due within the next 7 days.</Text>
            {overdueLoans.length === 0 && dueSoonLoans.length === 0 ? (
              <Text style={styles.emptyRepaymentText}>You're all clear. No overdue or upcoming loans.</Text>
            ) : (
              <ScrollView style={styles.repaymentList} showsVerticalScrollIndicator={false}>
                {overdueLoans.map((loan) => (
                  <View key={`overdue-${loan.id}`} style={styles.repaymentRow}>
                    <View style={styles.repaymentInfo}><Text style={[styles.repaymentName, { color: C.red }]}>{loan.friendName} · Overdue</Text><Text style={styles.repaymentDue}>Due: {loan.dueDate}</Text></View>
                    <Text style={styles.repaymentAmount}>{formatMoney(Number(loan.amount) || 0)}</Text>
                  </View>
                ))}
                {dueSoonLoans.map((loan) => (
                  <View key={`soon-${loan.id}`} style={styles.repaymentRow}>
                    <View style={styles.repaymentInfo}><Text style={styles.repaymentName}>{loan.friendName}</Text><Text style={styles.repaymentDue}>Due soon: {loan.dueDate}</Text></View>
                    <Text style={styles.repaymentAmount}>{formatMoney(Number(loan.amount) || 0)}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalActions}><Pressable onPress={() => setRemindersVisible(false)} style={[styles.modalButton, styles.saveButton]}><Text style={styles.modalButtonText}>Close</Text></Pressable></View>
          </View>
        </View>
      </Modal>

      <Modal visible={searchVisible} transparent animationType="fade" onRequestClose={() => setSearchVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Search Loans</Text>
            <Text style={styles.modalSubtitle}>Search by borrower, amount, due date, or status.</Text>
            <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search loans..." placeholderTextColor={C.faint} autoCapitalize="none" style={styles.formInput} />
            <ScrollView style={styles.repaymentList} showsVerticalScrollIndicator={false}>
              {searchedLoans.length === 0 ? <Text style={styles.emptyRepaymentText}>No matching loans found.</Text> : searchedLoans.map((loan) => (
                <View key={loan.id} style={styles.repaymentRow}>
                  <View style={styles.repaymentInfo}><Text style={styles.repaymentName} numberOfLines={1}>{loan.friendName}</Text><Text style={styles.repaymentDue}>Due: {loan.dueDate} · {loan.status}</Text></View>
                  <Text style={styles.repaymentAmount}>{formatMoney(Number(loan.amount) || 0)}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}><Pressable onPress={() => setSearchVisible(false)} style={[styles.modalButton, styles.saveButton]}><Text style={styles.modalButtonText}>Close</Text></Pressable></View>
          </View>
        </View>
      </Modal>

      <Modal visible={notificationsVisible} transparent animationType="fade" onRequestClose={() => setNotificationsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <Text style={styles.modalSubtitle}>Loan alerts based on your saved due dates.</Text>
            {notificationItems.length === 0 ? (
              <Text style={styles.emptyRepaymentText}>No loan alerts right now.</Text>
            ) : (
              <ScrollView style={styles.repaymentList} showsVerticalScrollIndicator={false}>
                {notificationItems.map((item) => (
                  <View key={item.id} style={styles.repaymentRow}>
                    <View style={styles.repaymentInfo}><Text style={[styles.repaymentName, { color: item.overdue ? C.red : C.text }]}>{item.title}</Text><Text style={styles.repaymentDue}>{item.detail}</Text></View>
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalActions}><Pressable onPress={() => setNotificationsVisible(false)} style={[styles.modalButton, styles.saveButton]}><Text style={styles.modalButtonText}>Close</Text></Pressable></View>
          </View>
        </View>
      </Modal>

      <Modal visible={activityVisible} transparent animationType="fade" onRequestClose={() => setActivityVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>All Activity</Text>
            <Text style={styles.modalSubtitle}>All active loan records, newest first.</Text>
            {loans.length === 0 ? <Text style={styles.emptyRepaymentText}>No activity yet. Add your first loan.</Text> : (
              <ScrollView style={styles.repaymentList} showsVerticalScrollIndicator={false}>
                {loans.map((loan) => (
                  <View key={loan.id} style={styles.repaymentRow}>
                    <View style={styles.repaymentInfo}><Text style={styles.repaymentName} numberOfLines={1}>{loan.friendName}</Text><Text style={styles.repaymentDue}>{loan.status === "repaid" ? `Repaid · ${loan.repaidAt ? new Date(loan.repaidAt).toLocaleDateString() : "Completed"}` : `Pending · Due ${loan.dueDate}`}</Text><Text style={styles.repaymentAmount}>{formatMoney(Number(loan.amount) || 0)}</Text></View>
                    <Pressable
                      onPress={() => handleArchiveLoan(loan)}
                      disabled={archivingLoanId !== null}
                      style={[styles.repayButton, archivingLoanId === loan.id && styles.disabledButton]}
                    >
                      <Text style={styles.repayButtonText}>{archivingLoanId === loan.id ? "Archiving..." : "Archive"}</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <Pressable onPress={() => void handleOpenArchivedLoans()} style={[styles.modalButton, styles.cancelButton]}>
                <Text style={styles.modalButtonText}>Archived loans</Text>
              </Pressable>
              <Pressable onPress={() => setActivityVisible(false)} style={[styles.modalButton, styles.saveButton]}><Text style={styles.modalButtonText}>Close</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={archivedLoansVisible} transparent animationType="fade" onRequestClose={() => setArchivedLoansVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Archived Loans</Text>
            <Text style={styles.modalSubtitle}>Archived loans are hidden from your active ledger. Restore any loan when needed.</Text>
            {archivedLoans.length === 0 ? (
              <Text style={styles.emptyRepaymentText}>No archived loans.</Text>
            ) : (
              <ScrollView style={styles.repaymentList} showsVerticalScrollIndicator={false}>
                {archivedLoans.map((loan) => (
                  <View key={loan.id} style={styles.repaymentRow}>
                    <View style={styles.repaymentInfo}>
                      <Text style={styles.repaymentName} numberOfLines={1}>{loan.friendName}</Text>
                      <Text style={styles.repaymentDue}>{loan.status === "repaid" ? "Repaid" : `Pending · Due ${loan.dueDate}`}</Text>
                      <Text style={styles.repaymentAmount}>{formatMoney(Number(loan.amount) || 0)}</Text>
                    </View>
                    <Pressable
                      onPress={() => handleRestoreLoan(loan)}
                      disabled={restoringLoanId !== null}
                      style={[styles.repayButton, restoringLoanId === loan.id && styles.disabledButton]}
                    >
                      <Text style={styles.repayButtonText}>{restoringLoanId === loan.id ? "Restoring..." : "Restore"}</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setArchivedLoansVisible(false)} style={[styles.modalButton, styles.saveButton]}><Text style={styles.modalButtonText}>Close</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarCard}>
            <Text style={styles.calendarEyebrow}>SELECT DUE DATE</Text>
            <Text style={styles.calendarTitle}>
              {calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </Text>
            <View style={styles.calendarMonthControls}>
              <Pressable
                onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                style={styles.calendarNavButton}
              ><Text style={styles.calendarNavText}>‹</Text></Pressable>
              <Pressable
                onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                style={styles.calendarNavButton}
              ><Text style={styles.calendarNavText}>›</Text></Pressable>
            </View>
            
<View style={styles.calendarGrid}>
  {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((dayName) => (
    <View key={dayName} style={styles.calendarCell}>
      <Text style={styles.calendarWeekday}>{dayName}</Text>
    </View>
  ))}

  {/* Empty cells to align the first day with Monday */}
  {Array.from(
    { length: (calendarMonth.getDay() + 6) % 7 },
    (_, i) => (
      <View key={`blank-${i}`} style={styles.calendarCell} />
    )
  )}

  {/* Calendar dates */}
  {Array.from(
    {
      length: new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + 1,
        0
      ).getDate(),
    },
    (_, i) => {
      const day = i + 1;

      const selectedMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(
        dueDate
      );

      const selected =
        selectedMatch !== null &&
        Number(selectedMatch[1]) === day &&
        Number(selectedMatch[2]) === calendarMonth.getMonth() + 1 &&
        Number(selectedMatch[3]) === calendarMonth.getFullYear();

      const today = new Date();

      const isToday =
        today.getDate() === day &&
        today.getMonth() === calendarMonth.getMonth() &&
        today.getFullYear() === calendarMonth.getFullYear();

      return (
        <Pressable
          key={day}
          onPress={() => {
            setDueDate(
              `${String(day).padStart(2, "0")}/${String(
                calendarMonth.getMonth() + 1
              ).padStart(2, "0")}/${calendarMonth.getFullYear()}`
            );
            setCalendarVisible(false);
          }}
          style={[
            styles.calendarCell,
            styles.calendarDay,
            isToday && styles.calendarToday,
            selected && styles.calendarSelected,
          ]}
        >
          <Text
            style={[
              styles.calendarDayText,
              isToday && styles.calendarTodayText,
              selected && styles.calendarSelectedText,
            ]}
          >
            {day}
          </Text>
        </Pressable>
      );
    }
  )}
</View>

            <View style={styles.calendarFooter}>
              <Pressable onPress={() => { const today = new Date(); setDueDate(`${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`); setCalendarVisible(false); }}>
                <Text style={styles.calendarTodayAction}>Today</Text>
              </Pressable>
              <Pressable onPress={() => setCalendarVisible(false)} style={styles.calendarDoneButton}>
                <Text style={styles.calendarDoneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  reportRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  reportLabel: { color: C.muted, fontSize: 13, flexShrink: 1, marginRight: 12 },
  reportValue: { color: C.text, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  repaymentList: { maxHeight: 360 },
  repaymentRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  repaymentInfo: { flex: 1, minWidth: 0 },
  repaymentName: { color: C.text, fontSize: 15, fontWeight: "700" },
  repaymentAmount: { color: "#D8B9FF", fontSize: 14, fontWeight: "700", marginTop: 4 },
  repaymentDue: { color: C.faint, fontSize: 11, marginTop: 3 },
  repayButton: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, backgroundColor: C.button, borderWidth: 1, borderColor: C.buttonBorder },
  repayButtonText: { color: C.text, fontSize: 12, fontWeight: "700" },
  emptyRepaymentText: { color: C.muted, fontSize: 14, paddingVertical: 18, textAlign: "center" },
  dateInputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateTextInput: { flex: 1 },
  calendarButton: { width: 48, height: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#30213F", borderWidth: 1, borderColor: C.accent },
  calendarButtonIcon: { color: C.text, fontSize: 25, fontWeight: "600" },
  dateHint: { color: C.faint, fontSize: 11, marginTop: 6 },
  calendarCard: { width: "100%", maxWidth: 360, alignSelf: "center", padding: 22, borderRadius: 26, borderWidth: 1, borderColor: "#5B3B7A", backgroundColor: "#17111F" },
  calendarEyebrow: { color: C.accent, fontSize: 11, letterSpacing: 1.6, fontWeight: "800" },
  calendarTitle: { color: C.text, fontSize: 23, fontWeight: "800", marginTop: 7 },
  calendarMonthControls: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: -34, marginBottom: 16 },
  calendarNavButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#30213F", borderWidth: 1, borderColor: C.cardBorder },
  calendarNavText: { color: C.text, fontSize: 26, lineHeight: 28 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarCell: { width: "14.2857%", height: 42, alignItems: "center", justifyContent: "center" },
  calendarWeekday: { color: C.muted, fontSize: 12, fontWeight: "700" },
  calendarDay: { borderRadius: 21 },
  calendarDayText: { color: C.text, fontSize: 14, fontWeight: "500" },
  calendarToday: { borderWidth: 1, borderColor: C.accent },
  calendarTodayText: { color: "#D8B9FF" },
  calendarSelected: { backgroundColor: C.button, borderWidth: 1, borderColor: C.buttonBorder },
  calendarSelectedText: { color: "#FFFFFF", fontWeight: "800" },
  calendarFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.cardBorder },
  calendarTodayAction: { color: "#D8B9FF", fontSize: 14, fontWeight: "700" },
  calendarDoneButton: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 18, backgroundColor: C.button },
  calendarDoneText: { color: C.text, fontSize: 13, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.card,
  },
  modalTitle: { color: C.text, fontSize: 22, fontWeight: "700" },
  modalSubtitle: { color: C.muted, fontSize: 13, marginTop: 5, marginBottom: 18 },
  fieldLabel: { color: "#E9E2F0", fontSize: 13, fontWeight: "600", marginBottom: 7, marginTop: 10 },
  formInput: {
    color: C.text,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 22 },
  modalButton: { flex: 1, minHeight: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  cancelButton: { backgroundColor: C.dark, borderColor: C.darkBorder },
  saveButton: { backgroundColor: C.button, borderColor: C.buttonBorder },
  disabledButton: { opacity: 0.6 },
  modalButtonText: { color: C.text, fontSize: 14, fontWeight: "700" },
});

// Keep the safe-area context available even if App.tsx does not provide one.
export default function HomeScreen(props: HomeScreenProps) {
  return (
    <SafeAreaProvider>
      <HomeScreenContent {...props} />
    </SafeAreaProvider>
  );
}
