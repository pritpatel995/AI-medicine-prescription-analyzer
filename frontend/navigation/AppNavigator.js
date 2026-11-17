
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import {
  Home,
  Pill,
  UserRound,
  CalendarDays,
  Mic,
} from "lucide-react-native";

import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/theme";

import AuthScreen from "../screens/AuthScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ScanScreen from "../screens/ScanScreen";
import ManualMedicineScreen from "../screens/ManualMedicineScreen";
import ReviewScreen from "../screens/ReviewScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PrescriptionsScreen from "../screens/PrescriptionsScreen";
import AppointmentsScreen from "../screens/AppointmentsScreen";
import VoiceAssistantScreen from "../screens/VoiceAssistantScreen";
import ReminderSettingsScreen from "../screens/ReminderSettingsScreen";

const RootStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// =====================================================
// MAIN BOTTOM TABS
// =====================================================

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#8A8A8A",

        tabBarStyle: {
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E8E8E8",
          borderTopWidth: 1,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },

        tabBarIcon: ({ color, size }) => {
          const iconSize = size || 23;

          switch (route.name) {
            case "Home":
              return <Home size={iconSize} color={color} />;

            case "Prescriptions":
              return <Pill size={iconSize} color={color} />;

            case "Appointments":
              return (
                <CalendarDays size={iconSize} color={color} />
              );

            case "VoiceAssistant":
              return <Mic size={iconSize} color={color} />;

            case "Profile":
              return (
                <UserRound size={iconSize} color={color} />
              );

            default:
              return <Home size={iconSize} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: "Home",
        }}
      />

      <Tab.Screen
        name="Prescriptions"
        component={PrescriptionsScreen}
        options={{
          title: "Prescriptions",
        }}
      />

      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          title: "Appointments",
        }}
      />

      <Tab.Screen
        name="VoiceAssistant"
        component={VoiceAssistantScreen}
        options={{
          title: "Voice AI",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

// =====================================================
// AUTHENTICATED APP NAVIGATION
// =====================================================

function AppFlow() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AppStack.Screen
        name="MainTabs"
        component={MainTabs}
      />

      <AppStack.Screen
        name="ReminderSettings"
        component={ReminderSettingsScreen}
      />

      <AppStack.Screen
        name="Scan"
        component={ScanScreen}
      />

      <AppStack.Screen
        name="ManualMedicine"
        component={ManualMedicineScreen}
      />

      <AppStack.Screen
        name="Review"
        component={ReviewScreen}
      />
    </AppStack.Navigator>
  );
}

// =====================================================
// AUTHENTICATION NAVIGATION
// =====================================================

function AuthFlow() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <RootStack.Screen
        name="Auth"
        component={AuthScreen}
      />
    </RootStack.Navigator>
  );
}

// =====================================================
// LOADING SCREEN
// =====================================================

function SplashLoader() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background || "#F4F7FB",
      }}
    >
      <ActivityIndicator
        size="large"
        color={colors.primary}
      />
    </View>
  );
}

// =====================================================
// MAIN APP NAVIGATOR
// =====================================================

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <SplashLoader />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppFlow /> : <AuthFlow />}
    </NavigationContainer>
  );
}

