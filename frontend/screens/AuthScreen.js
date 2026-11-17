import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Eye, EyeOff, Lock, Mail, Ruler, ShieldCheck, User, Weight } from "lucide-react-native";
import { useSharedValue } from "react-native-reanimated";

import AppButton from "../components/AppButton";
import { useAuth } from "../context/AuthContext";
import { colors, radii, shadow, spacing, typography } from "../theme/theme";

const TAB_WIDTH = 150;
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function AuthScreen() {
  const { login, register, authError, sessionExpired, clearSessionExpired } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const indicatorX = useSharedValue(0);

  const switchMode = (nextMode) => {
    setLocalError(null);
    clearSessionExpired();
    setMode(nextMode);
    indicatorX.value = withTiming(nextMode === "login" ? 0 : TAB_WIDTH, { duration: 220 });
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleSubmit = async () => {
    setLocalError(null);
    clearSessionExpired();

    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      setLocalError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    const ok =
      mode === "login"
        ? await login(email.trim(), password)
        : await register(name.trim(), email.trim(), password, {
            age: age.trim() ? parseInt(age, 10) : null,
            gender: gender || null,
            height_cm: heightCm.trim() ? parseFloat(heightCm) : null,
            weight_kg: weightKg.trim() ? parseFloat(weightKg) : null,
          });
    setSubmitting(false);

    if (!ok) {
      setLocalError(authError || "Something went wrong.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerWrap}>
          <View style={styles.logoCircle}>
            <ShieldCheck color={colors.primary} size={28} />
          </View>
          <Text style={typography.h1}>Rx Analyzer</Text>
          <Text style={typography.bodyMuted}>Scan. Understand. Never miss a dose.</Text>
        </View>

        <View style={styles.tabBar}>
          <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
          <Text
            onPress={() => switchMode("login")}
            style={[styles.tabLabel, mode === "login" && styles.tabLabelActive]}
          >
            Log In
          </Text>
          <Text
            onPress={() => switchMode("register")}
            style={[styles.tabLabel, mode === "register" && styles.tabLabelActive]}
          >
            Register
          </Text>
        </View>

        <View style={styles.form}>
          {mode === "register" && (
            <View style={styles.inputWrap}>
              <User color={colors.textFaint} size={18} />
              <TextInput
                placeholder="Full name"
                placeholderTextColor={colors.textFaint}
                value={name}
                onChangeText={setName}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrap}>
            <Mail color={colors.textFaint} size={18} />
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.textFaint}
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrap}>
            <Lock color={colors.textFaint} size={18} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textFaint}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry={!showPassword}
            />
            <Text onPress={() => setShowPassword((s) => !s)}>
              {showPassword ? (
                <EyeOff color={colors.textFaint} size={18} />
              ) : (
                <Eye color={colors.textFaint} size={18} />
              )}
            </Text>
          </View>

          {mode === "register" && (
            <>
              <Text style={styles.sectionLabel}>HEALTH PROFILE (OPTIONAL)</Text>

              <View style={styles.row}>
                <View style={[styles.inputWrap, styles.rowInput]}>
                  <TextInput
                    placeholder="Age"
                    placeholderTextColor={colors.textFaint}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.inputWrap, styles.rowInput]}>
                  <Ruler color={colors.textFaint} size={16} />
                  <TextInput
                    placeholder="Height (cm)"
                    placeholderTextColor={colors.textFaint}
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.inputWrap}>
                <Weight color={colors.textFaint} size={16} />
                <TextInput
                  placeholder="Weight (kg)"
                  placeholderTextColor={colors.textFaint}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>

              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((option) => (
                  <Text
                    key={option.value}
                    onPress={() => setGender(option.value)}
                    style={[
                      styles.genderChip,
                      gender === option.value && styles.genderChipActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                ))}
              </View>
            </>
          )}

          {sessionExpired && (
            <Text style={styles.sessionExpiredText}>
              Your session expired — please log in again.
            </Text>
          )}

          {(localError || authError) && (
            <Text style={styles.errorText}>{localError || authError}</Text>
          )}

          <AppButton
            title={mode === "login" ? "Log In" : "Create Account"}
            onPress={handleSubmit}
            loading={submitting}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: "center",
  },
  headerWrap: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    width: TAB_WIDTH,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  tabLabel: {
    width: TAB_WIDTH,
    textAlign: "center",
    lineHeight: 40,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowInput: {
    flex: 1,
  },
  sectionLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  genderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  genderChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    overflow: "hidden",
  },
  genderChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  sessionExpiredText: {
    color: colors.warning,
    fontSize: 13,
    textAlign: "center",
  },
});