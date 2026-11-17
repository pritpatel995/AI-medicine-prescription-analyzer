import React, { useRef, useState } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Image as ImageIcon, ScanLine, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import AppButton from "../components/AppButton";
import { scanPrescription } from "../services/api";
import { colors, radii, spacing, typography } from "../theme/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FRAME_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
const FRAME_HEIGHT = FRAME_WIDTH * 1.3;

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const cameraRef = useRef(null);

  const laserY = useSharedValue(0);

  React.useEffect(() => {
    laserY.value = withRepeat(
      withTiming(FRAME_HEIGHT - 4, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const laserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laserY.value }],
  }));

  const handleScanResult = async (imageUri) => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await scanPrescription(imageUri);
      navigation.navigate("Review", { scanResult: result, imageUri });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      await handleScanResult(photo.uri);
    } catch (err) {
      setError("Could not capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await handleScanResult(result.assets[0].uri);
    }
  };

  if (!permission) {
    return <View style={styles.flex} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.flex, styles.centered]}>
        <ScanLine color={colors.primary} size={40} />
        <Text style={[typography.h3, { marginTop: spacing.md, textAlign: "center" }]}>
          Camera access is needed to scan prescriptions
        </Text>
        <AppButton title="Grant Permission" onPress={requestPermission} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.topBar}>
        <X
          color={colors.white}
          size={26}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.topBarTitle}>Scan Prescription</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.overlayCenter}>
        <View style={styles.frame}>
          {[styles.cornerTL, styles.cornerTR, styles.cornerBL, styles.cornerBR].map((cornerStyle, i) => (
            <View key={i} style={[styles.corner, cornerStyle]} />
          ))}
          <Animated.View style={[styles.laser, laserStyle]} />
        </View>
        <Text style={styles.hintText}>Align the prescription within the frame</Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <View style={styles.bottomBar}>
        <View style={styles.galleryButton}>
          <ImageIcon color={colors.white} size={24} onPress={handlePickFromGallery} />
        </View>

        <View style={styles.captureOuter}>
          <View
            style={styles.captureInner}
            onTouchEnd={handleCapture}
          />
        </View>

        <View style={{ width: 48 }} />
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ScanLine color={colors.primary} size={32} />
            <Text style={[typography.h3, { marginTop: spacing.sm }]}>Reading prescription…</Text>
            <Text style={typography.bodyMuted}>Running OCR and AI extraction</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#000" },
  centered: { alignItems: "center", justifyContent: "center", padding: spacing.lg },
  topBar: {
    position: "absolute",
    top: spacing.xl,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  topBarTitle: { color: colors.white, fontSize: 16, fontWeight: "600" },
  overlayCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radii.sm },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radii.sm },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radii.sm },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radii.sm },
  laser: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accent,
    boxShadow: "0px 0px 8px rgba(22, 199, 154, 0.8)",
  },
  hintText: {
    color: colors.white,
    marginTop: spacing.lg,
    fontSize: 14,
  },
  bottomBar: {
    position: "absolute",
    bottom: spacing.xxl,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: spacing.xl,
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureOuter: {
    width: 78,
    height: 78,
    borderRadius: radii.pill,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  errorBanner: {
    position: "absolute",
    top: 90,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorBannerText: { color: colors.danger, fontSize: 13, textAlign: "center" },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  processingCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    width: FRAME_WIDTH * 0.85,
  },
});
