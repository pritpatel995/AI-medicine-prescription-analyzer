
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";
import { CalendarDays, Plus, Trash2, Pencil, X } from "lucide-react-native";

import {
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
  seedDemoAppointments,
} from "../services/api";

import { colors, spacing, typography, radii } from "../theme/theme";
import AppButton from "../components/AppButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const blank = () => ({
  doctor_name: "",
  specialty: "",
  appointment_date: new Date().toISOString().slice(0, 10),
  appointment_time: "10:00",
  clinic_name: "",
  address: "",
  phone: "",
  notes: "",
});

const fields = [
  ["doctor_name", "Doctor name *", "e.g. Dr. Mehta"],
  ["specialty", "Specialty", "e.g. Dentist / Cardiologist"],
  ["appointment_date", "Date * (YYYY-MM-DD)", "2026-12-31"],
  ["appointment_time", "Time * (24-hour HH:MM)", "10:30"],
  ["clinic_name", "Clinic / hospital", "Clinic name"],
  ["address", "Address", "Clinic address"],
  ["phone", "Contact number", "Phone number"],
  ["notes", "Notes", "Reason, documents to bring, etc."],
];

function dateTime(item) {
  return new Date(
    `${item.appointment_date}T${item.appointment_time}:00`
  );
}

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
  setLoading(true);

  try {
    let data = await listAppointments();

    // Automatically add demo appointments if the account has none.
    if (Array.isArray(data) && data.length === 0) {
      await seedDemoAppointments();
      data = await listAppointments();
    }

    setItems(Array.isArray(data) ? data : []);
  } catch (e) {
    Alert.alert(
      "Appointments",
      e.response?.data?.detail ||
        e.message ||
        "Could not load appointments."
    );
  } finally {
    setLoading(false);
  }
}, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openNew = () => {
    setEditing(null);
    setForm(blank());
    setModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);

    setForm({
      doctor_name: item.doctor_name || "",
      specialty: item.specialty || "",
      appointment_date: item.appointment_date || "",
      appointment_time: item.appointment_time || "10:00",
      clinic_name: item.clinic_name || "",
      address: item.address || "",
      phone: item.phone || "",
      notes: item.notes || "",
    });

    setModal(true);
  };

  const save = async () => {
    if (!form.doctor_name.trim()) {
      Alert.alert("Missing doctor", "Enter the doctor's name.");
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.appointment_date) ||
      Number.isNaN(
        Date.parse(`${form.appointment_date}T00:00:00`)
      )
    ) {
      Alert.alert(
        "Invalid date",
        "Use YYYY-MM-DD, for example 2026-12-31."
      );
      return;
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.appointment_time)
    ) {
      Alert.alert(
        "Invalid time",
        "Use 24-hour HH:MM, for example 14:30."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        doctor_name: form.doctor_name.trim(),
        specialty: form.specialty.trim(),
        clinic_name: form.clinic_name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
      };

      if (editing) {
        await updateAppointment(editing.id, payload);
      } else {
        await createAppointment(payload);
      }

      setModal(false);
      await load();

      Alert.alert(
        "Success",
        editing
          ? "Appointment updated successfully."
          : "Appointment added successfully."
      );
    } catch (e) {
      Alert.alert(
        "Could not save appointment",
        e.response?.data?.detail ||
          e.message ||
          "Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = (item) => {
    Alert.alert(
      "Delete appointment?",
      `Remove the appointment with ${item.doctor_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAppointment(item.id);
              await load();
              Alert.alert("Deleted", "Appointment removed successfully.");
            } catch (e) {
              Alert.alert(
                "Could not delete",
                e.response?.data?.detail ||
                  e.message ||
                  "Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const now = new Date();

  const sorted = [...items].sort(
    (a, b) => dateTime(a).getTime() - dateTime(b).getTime()
  );

  const upcoming = sorted.filter((item) => dateTime(item) >= now);
  const past = sorted
    .filter((item) => dateTime(item) < now)
    .reverse();

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>
            {item.appointment_date?.slice(8, 10)}
          </Text>

          <Text style={styles.dateMonth}>
            {item.appointment_date?.slice(5, 7)}/
            {item.appointment_date?.slice(0, 4)}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.doctor}>{item.doctor_name}</Text>

          {!!item.specialty && (
            <Text style={styles.muted}>{item.specialty}</Text>
          )}

          <Text style={styles.details}>
            {item.appointment_time} ·{" "}
            {item.clinic_name || "Clinic not specified"}
          </Text>
        </View>

        <Pressable
          onPress={() => openEdit(item)}
          style={styles.iconButton}
          accessibilityLabel="Edit appointment"
        >
          <Pencil size={18} color={colors.primary} />
        </Pressable>

        <Pressable
          onPress={() => remove(item)}
          style={styles.iconButton}
          accessibilityLabel="Delete appointment"
        >
          <Trash2 size={18} color={colors.danger} />
        </Pressable>
      </View>

      {!!item.address && (
        <Text style={styles.detailLine}>📍 {item.address}</Text>
      )}

      {!!item.phone && (
        <Text style={styles.detailLine}>☎ {item.phone}</Text>
      )}

      {!!item.notes && (
        <Text style={styles.notes}>{item.notes}</Text>
      )}
    </View>
  );

  const renderSection = (title, data, emptyText) => (
    <View>
      <Text style={styles.sectionTitle}>
        {title} ({data.length})
      </Text>

      {data.length > 0 ? (
        data.map((item) => (
          <View key={item.id}>{renderItem({ item })}</View>
        ))
      ) : (
        <Text style={styles.empty}>{emptyText}</Text>
      )}
    </View>
  );

  return (
   <View
  style={[
    styles.container,
    { paddingTop: insets.top },
  ]}
>
      {/* Page heading */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={typography.h1}>Doctor Appointments</Text>
          <Text style={typography.bodyMuted}>
            Keep your visits organised
          </Text>
        </View>

        <CalendarDays size={26} color={colors.primary} />
      </View>

      {/* Appointment list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {renderSection(
          "Upcoming",
          upcoming,
          "No upcoming appointments. Tap Add Appointment to schedule one."
        )}

        {renderSection(
          "Past appointments",
          past,
          "Your past visits will appear here."
        )}
      </ScrollView>

      {/* Add button fixed at bottom of this screen, above parent tab bar */}
      <View style={styles.bottomAction}>
        <AppButton
          title="+ Add Appointment"
          onPress={openNew}
          style={styles.bottomAddButton}
        />
      </View>

      {/* Add/Edit form */}
      <Modal
        visible={modal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={typography.h2}>
                {editing ? "Edit appointment" : "New appointment"}
              </Text>

              <Text style={typography.bodyMuted}>
                Enter the appointment details below.
              </Text>
            </View>

            <Pressable
              onPress={() => setModal(false)}
              style={styles.closeButton}
              accessibilityLabel="Close appointment form"
            >
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}
          >
            {fields.map(([key, label, placeholder]) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>

                <TextInput
                  value={form[key]}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      [key]: value,
                    }))
                  }
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    key === "notes" && styles.notesInput,
                  ]}
                  multiline={key === "notes"}
                  autoCapitalize={
                    key === "phone" ? "none" : "sentences"
                  }
                />
              </View>
            ))}

            {/* Save button after all fields */}
            <AppButton
              title={
                saving
                  ? "Saving..."
                  : editing
                  ? "Save Changes"
                  : "Save Appointment"
              }
              onPress={save}
              disabled={saving}
              style={styles.saveButton}
            />

            <Pressable
              onPress={() => setModal(false)}
              disabled={saving}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  list: {
    flex: 1,
  },

  listContent: {
    paddingBottom: spacing.md,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dateBox: {
    width: 54,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },

  dateDay: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },

  dateMonth: {
    fontSize: 10,
    color: colors.textMuted,
  },

  doctor: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },

  muted: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },

  details: {
    fontSize: 12,
    color: colors.text,
    marginTop: 5,
  },

  iconButton: {
    padding: 5,
  },

  detailLine: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },

  notes: {
    color: colors.text,
    fontSize: 13,
    marginTop: 8,
  },

  empty: {
    color: colors.textMuted,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    lineHeight: 20,
  },

  bottomAction: {
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  bottomAddButton: {
    width: "100%",
  },

  modalRoot: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  closeButton: {
    padding: 6,
  },

  formContent: {
    paddingBottom: 36,
  },

  field: {
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 14,
  },

  notesInput: {
    height: 90,
    textAlignVertical: "top",
  },

  saveButton: {
    marginTop: 12,
  },

  cancelButton: {
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 4,
  },

  cancelText: {
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 14,
  },
});

