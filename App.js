//App:
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeModeProvider, useAppThemeMode } from "./src/context/ThemeModeContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { appDarkTheme, appLightTheme } from "./src/theme/theme";

function AppContent() {
  const { isDarkMode } = useAppThemeMode();

  const paperTheme = isDarkMode ? appDarkTheme : appLightTheme;

  const navigationTheme = useMemo(() => {
    const baseTheme = isDarkMode ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      dark: isDarkMode,
      colors: {
        ...baseTheme.colors,
        primary: paperTheme.colors.primary,
        background: paperTheme.colors.background,
        card: paperTheme.colors.surface,
        text: paperTheme.colors.onSurface,
        border: paperTheme.colors.outline,
        notification: paperTheme.colors.primary,
      },
    };
  }, [isDarkMode, paperTheme]);

  useEffect(() => {
    async function configureSystemBars() {
      try {
        await NavigationBar.setBackgroundColorAsync(paperTheme.colors.background);
        await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark");
      } catch (error) {
        console.log("NAVIGATION BAR CONFIG ERROR:", error);
      }
    }

    configureSystemBars();
  }, [isDarkMode, paperTheme]);

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar
            style={isDarkMode ? "light" : "dark"}
            backgroundColor={paperTheme.colors.background}
          />

          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeModeProvider>
          <AppContent />
        </ThemeModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}