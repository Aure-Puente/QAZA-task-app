//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import DriveScreen from "../screens/DriveScreen";
import ProfileScreen from "../screens/ProfileScreen";
import TaskHistoryScreen from "../screens/TaskHistoryScreen";
import NotesStackNavigator from "./NotesStackNavigator";
import TasksCalendarStackNavigator from "./TasksCalendarStackNavigator";

//JS:
const Tab = createBottomTabNavigator();

const hexToRgba = (hex, alpha = 1) => {
  const clean = String(hex || "").replace("#", "");

  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return `rgba(209, 107, 24, ${alpha})`;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function TabBarButton({
  children,
  onPress,
  onLongPress,
  style,
  rippleColor = "rgba(0,0,0,0.08)",
  focused = false,
  styles,
  ...rest
}) {
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const activeScale = useRef(new Animated.Value(focused ? 1 : 0.96)).current;

  useEffect(() => {
    Animated.spring(activeScale, {
      toValue: focused ? 1 : 0.96,
      useNativeDriver: true,
      speed: 18,
      bounciness: 4,
    }).start();
  }, [focused, activeScale]);

  const handlePressIn = () => {
    rippleOpacity.setValue(1);
    rippleScale.setValue(0);

    Animated.timing(rippleScale, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(rippleOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [
        style,
        styles.tabButtonBase,
        pressed && styles.tabButtonPressed,
      ]}
      {...rest}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.rippleContainer,
          { opacity: rippleOpacity },
        ]}
      >
        <Animated.View
          style={[
            styles.rippleCircle,
            {
              backgroundColor: rippleColor,
              transform: [{ scale: rippleScale }],
            },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.innerButtonWrap,
          {
            transform: [{ scale: activeScale }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function TabIconLabel({
  routeName,
  color,
  size,
  focused,
  primary,
  isDarkMode,
  styles,
}) {
  let iconName = "home-outline";
  let label = routeName;

  if (routeName === "Drive") {
    iconName = "google-drive";
    label = "Drive";
  }

  if (routeName === "Notas") {
    iconName = focused ? "notebook-edit" : "notebook-edit-outline";
    label = "Notas";
  }

  if (routeName === "Tareas") {
    iconName = focused ? "calendar-month" : "calendar-month-outline";
    label = "Tareas";
  }

  if (routeName === "Historial") {
    iconName = focused ? "clipboard-check" : "clipboard-check-outline";
    label = "Historial";
  }

  if (routeName === "Perfil") {
    iconName = focused ? "account" : "account-outline";
    label = "Perfil";
  }

  return (
    <View style={styles.tabContent}>
      <View
        style={[
          styles.iconPill,
          focused && {
            backgroundColor: isDarkMode
              ? hexToRgba(primary, 0.18)
              : hexToRgba(primary, 0.12),
            borderColor: isDarkMode
              ? hexToRgba(primary, 0.28)
              : hexToRgba(primary, 0.18),
          },
        ]}
      >
        <MaterialCommunityIcons name={iconName} size={size} color={color} />
      </View>

      <Text
        style={[
          styles.customLabel,
          {
            color,
            fontWeight: focused ? "800" : "600",
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AppTabs() {
  const theme = useTheme();

  const isDarkMode = !!theme.dark;
  const primary = theme.colors.primary;

  const custom = theme.custom || {};

  const tabBackground = custom.tabBg || theme.colors.surface;
  const tabBorder = custom.border || theme.colors.outline;
  const inactiveColor = custom.textMuted || theme.colors.onSurfaceVariant;
  const shadowColor = custom.shadow || "#000000";

  const primarySoft = isDarkMode
    ? hexToRgba(primary, 0.18)
    : hexToRgba(primary, 0.14);

  const styles = useMemo(
    () =>
      createStyles({
        isDarkMode,
        primary,
        tabBackground,
        tabBorder,
        shadowColor,
      }),
    [isDarkMode, primary, tabBackground, tabBorder, shadowColor]
  );

  return (
    <Tab.Navigator
      initialRouteName="Tareas"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: inactiveColor,
        tabBarHideOnKeyboard: true,

        tabBarStyle: {
          backgroundColor: tabBackground,
          borderTopColor: tabBorder,
          borderTopWidth: 1,
          height: 110,
          paddingTop: 4,
          shadowColor,
          shadowOpacity: isDarkMode ? 0.22 : 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
          elevation: 10,
        },

        tabBarShowLabel: false,

        tabBarItemStyle: {
          paddingTop: 2,
        },

        tabBarButton: (props) => (
          <TabBarButton
            {...props}
            styles={styles}
            rippleColor={primarySoft}
            focused={props.accessibilityState?.selected}
          />
        ),

        tabBarIcon: ({ color, focused }) => (
          <TabIconLabel
            routeName={route.name}
            color={color}
            size={27}
            focused={focused}
            primary={primary}
            isDarkMode={isDarkMode}
            styles={styles}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Drive"
        component={DriveScreen}
        options={{ title: "Drive" }}
      />

      <Tab.Screen
        name="Notas"
        component={NotesStackNavigator}
        options={{ title: "Notas" }}
      />

      <Tab.Screen
        name="Tareas"
        component={TasksCalendarStackNavigator}
        options={{ title: "Tareas" }}
      />

      <Tab.Screen
        name="Historial"
        component={TaskHistoryScreen}
        options={{ title: "Historial" }}
      />

      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ title: "Perfil" }}
      />
    </Tab.Navigator>
  );
}

function createStyles({ isDarkMode, primary, tabBackground, tabBorder }) {
  return StyleSheet.create({
    tabButtonBase: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    tabButtonPressed: {
      opacity: 0.95,
    },

    innerButtonWrap: {
      alignItems: "center",
      justifyContent: "center",
    },

    rippleContainer: {
      alignItems: "center",
      justifyContent: "center",
    },

    rippleCircle: {
      width: 82,
      height: 70,
      borderRadius: 26,
    },

    tabContent: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 72,
    },

    iconPill: {
      minWidth: 46,
      height: 36,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
      backgroundColor: "transparent",
    },

    customLabel: {
      fontSize: 11.5,
      lineHeight: 15,
      marginBottom: 6,
    },
  });
}