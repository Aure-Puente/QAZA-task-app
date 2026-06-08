//App:
import { NavigationContainer } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { appTheme } from "./src/theme/theme";

export default function App() {
  useEffect(() => {
    async function configureSystemBars() {
      await NavigationBar.setBackgroundColorAsync("#ffffff");
      await NavigationBar.setButtonStyleAsync("dark");
    }

    configureSystemBars();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={appTheme}>
          <AuthProvider>
            <NavigationContainer>
              <StatusBar style="dark" backgroundColor="#ffffff" />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}