import { Platform } from "react-native";

export const colors = {
  bg: "#F4F7FB",
  card: "#FFFFFF",
  primary: "#2F6FED",
  primaryDark: "#1E4FB8",
  primarySoft: "#E7EFFE",
  accent: "#16C79A",
  accentSoft: "#E3FBF4",
  danger: "#F0473E",
  dangerSoft: "#FDECEB",
  warning: "#F5A623",
  warningSoft: "#FEF4E3",
  text: "#141B2E",
  textMuted: "#6B7385",
  textFaint: "#A2A8B8",
  border: "#E7EAF2",
  white: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "700", color: colors.text },
  h2: { fontSize: 22, fontWeight: "700", color: colors.text },
  h3: { fontSize: 17, fontWeight: "600", color: colors.text },
  body: { fontSize: 15, fontWeight: "400", color: colors.text },
  bodyMuted: { fontSize: 14, fontWeight: "400", color: colors.textMuted },
  caption: { fontSize: 12, fontWeight: "500", color: colors.textFaint },
  button: { fontSize: 16, fontWeight: "600", color: colors.white },
};

// Cross-platform card shadow: native iOS/Android need shadowColor/Offset/
// Opacity/Radius + elevation; web needs boxShadow. Using both covers all
// three targets without silently dropping shadows on iOS.
export const shadow = {
  card: Platform.select({
    web: {
      boxShadow: "0px 6px 16px rgba(15, 27, 61, 0.06)",
      elevation: 3,
    },
    default: {
      shadowColor: "#0F1B3D",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
  }),
};