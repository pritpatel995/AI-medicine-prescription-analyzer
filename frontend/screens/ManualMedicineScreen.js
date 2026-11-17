import React, { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ArrowLeft, Check, Clock, Pill } from "lucide-react-native";
import { savePrescription } from "../services/api";
import { colors, spacing, typography, radii } from "../theme/theme";

const MEDICINE_FORMS = [
  { label: "Tablet", value: "tablet" },
  { label: "Capsule", value: "capsule" },
  { label: "Syrup", value: "syrup" },
  { label: "Injection", value: "injection" },
  { label: "Drops", value: "drops" },
  { label: "Ointment", value: "ointment" },
  { label: "Inhaler", value: "inhaler" },
  { label: "Other", value: "other" },
];

const FREQUENCIES = [
  { label: "Once daily", value: "Once daily", times: "08:00" },
  {
    label: "Twice daily",
    value: "Twice daily",
    times: "08:00, 20:00",
  },
  {
    label: "3 times daily",
    value: "Three times daily",
    times: "08:00, 14:00, 20:00",
  },
  {
    label: "4 times daily",
    value: "Four times daily",
    times: "08:00, 12:00, 16:00, 20:00",
  },
];

export default function ManualMedicineScreen({ navigation }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [form, setForm] = useState("tablet");
  const [frequency, setFrequency] = useState("Twice daily");
  const [times, setTimes] = useState("08:00, 20:00");
  const [duration, setDuration] = useState("7");
  const [instructions, setInstructions] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const handleFrequencyChange = (selectedFrequency) => {
    setFrequency(selectedFrequency.value);
    setTimes(selectedFrequency.times);
  };

  const handleSave = async () => {
    const medicineName = name.trim();
    const medicineDosage = dosage.trim();

    if (!medicineName) {
      Alert.alert("Medicine name required", "Please enter the medicine name.");
      return;
    }

    if (!medicineDosage) {
      Alert.alert("Dosage required", "Enter the prescribed dosage, for example 500mg.");
      return;
    }

    const durationDays = Number(duration);

    if (
      !duration.trim() ||
      !Number.isInteger(durationDays) ||
      durationDays < 1 ||
      durationDays > 365
    ) {
      Alert.alert(
        "Invalid duration",
        "Enter a duration between 1 and 365 days."
      );
      return;
    }

    const medicineTimes = times
      .split(",")
      .map((time) => time.trim())
      .filter(Boolean);

    if (medicineTimes.length === 0) {
      Alert.alert(
        "Reminder time required",
        "Enter at least one reminder time, such as 08:00."
      );
      return;
    }

    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (!medicineTimes.every((time) => validTime.test(time))) {
      Alert.alert(
        "Invalid reminder time",
        "Use 24-hour format, such as 08:00, 14:00, 20:00."
      );
      return;
    }

    if (new Set(medicineTimes).size !== medicineTimes.length) {
      Alert.alert(
        "Duplicate reminder time",
        "Please enter each reminder time only once."
      );
      return;
    }

    setIsSaving(true);

    try {
      const prescription = {
        medicines: [
          {
            name: medicineName,
            dosage: medicineDosage,
            form,
            frequency,
            times: medicineTimes,
            instructions: instructions.trim() || null,
            duration_days: durationDays,
          },
        ],
      };

      await savePrescription(prescription);

      Alert.alert(
        "Medicine added successfully",
        `${medicineName} has been saved. Your reminder schedule has been created where supported.`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Could not save medicine",
        error?.message ||
          "Something went wrong. Please check your internet connection and try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Add Medicine</Text>
          <Text style={styles.headerSubtitle}>
            Enter your prescribed medicine details
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Pill size={22} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Pill size={22} color={colors.primary} />
          </View>

          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>Medicine details</Text>
            <Text style={styles.infoDescription}>
              Enter the information exactly as prescribed by your doctor.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Basic information</Text>

        <Text style={styles.label}>Medicine name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Paracetamol"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.label}>Dosage *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 500mg or 5ml"
          placeholderTextColor={colors.textMuted}
          value={dosage}
          onChangeText={setDosage}
          autoCapitalize="none"
          returnKeyType="next"
        />

        <Text style={styles.label}>Medicine type</Text>
        <View style={styles.chipContainer}>
          {MEDICINE_FORMS.map((item) => {
            const selected = form === item.value;

            return (
              <Pressable
                key={item.value}
                onPress={() => setForm(item.value)}
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Schedule and reminders</Text>

        <Text style={styles.label}>Frequency</Text>
        <View style={styles.frequencyContainer}>
          {FREQUENCIES.map((item) => {
            const selected = frequency === item.value;

            return (
              <Pressable
                key={item.value}
                onPress={() => handleFrequencyChange(item)}
                style={[
                  styles.frequencyOption,
                  selected && styles.frequencyOptionSelected,
                ]}
              >
                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterSelected,
                  ]}
                >
                  {selected && <View style={styles.radioInner} />}
                </View>

                <Text
                  style={[
                    styles.frequencyText,
                    selected && styles.frequencyTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Reminder times *</Text>

        <View style={styles.timeInputWrap}>
          <Clock size={19} color={colors.primary} />

          <TextInput
            style={styles.timeInput}
            placeholder="08:00, 20:00"
            placeholderTextColor={colors.textMuted}
            value={times}
            onChangeText={setTimes}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={styles.helperText}>
          Use 24-hour format and separate multiple times with commas.
          Example: 08:00, 14:00, 20:00.
        </Text>

        <Text style={styles.label}>Duration (days) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 7"
          placeholderTextColor={colors.textMuted}
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          maxLength={3}
        />

        <Text style={styles.label}>Instructions (optional)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="e.g. After food"
          placeholderTextColor={colors.textMuted}
          value={instructions}
          onChangeText={setInstructions}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Important</Text>
          <Text style={styles.warningText}>
            Follow your doctor's prescription for the dosage, frequency,
            and duration. The suggested reminder times are editable.
          </Text>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={[
            styles.saveButton,
            isSaving && styles.saveButtonDisabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Check size={20} color={colors.white} />
              <Text style={styles.saveButtonText}>Save Medicine</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => navigation.goBack()}
          disabled={isSaving}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? spacing.xl : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },

  headerTitleWrap: {
    flex: 1,
  },

  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },

  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
  },

  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },

  infoTextWrap: {
    flex: 1,
  },

  infoTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },

  infoDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.md,
    marginBottom: 8,
  },

  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border || "#E2E8F0",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 14,
  },

  multilineInput: {
    minHeight: 90,
    paddingTop: 14,
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    borderWidth: 1,
    borderColor: colors.border || "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },

  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },

  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  chipTextSelected: {
    color: colors.primary,
    fontWeight: "800",
  },

  frequencyContainer: {
    gap: 8,
  },

  frequencyOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border || "#E2E8F0",
    backgroundColor: colors.card,
  },

  frequencyOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },

  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  radioOuterSelected: {
    borderColor: colors.primary,
  },

  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  frequencyText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },

  frequencyTextSelected: {
    color: colors.primary,
    fontWeight: "800",
  },

  timeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border || "#E2E8F0",
    borderRadius: radii.md,
    paddingLeft: spacing.md,
  },

  timeInput: {
    flex: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 14,
  },

  helperText: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },

  warningCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.warningSoft || "#FFF7E6",
  },

  warningTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 5,
  },

  warningText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 16,
    marginTop: spacing.xl,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },

  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 4,
  },

  cancelButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
});