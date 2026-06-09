//Importaciones:
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

//JS:
const THEME_STORAGE_KEY = "qaza_theme_mode";

const ThemeModeContext = createContext();

export function ThemeModeProvider({ children }) {
    const systemColorScheme = useColorScheme();

    const [themeMode, setThemeMode] = useState("system");
    const [themeModeLoading, setThemeModeLoading] = useState(true);

    useEffect(() => {
        async function loadThemeMode() {
        try {
            const savedThemeMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);

            if (
            savedThemeMode === "light" ||
            savedThemeMode === "dark" ||
            savedThemeMode === "system"
            ) {
            setThemeMode(savedThemeMode);
            }
        } catch (error) {
            console.log("LOAD THEME MODE ERROR:", error);
        } finally {
            setThemeModeLoading(false);
        }
        }

        loadThemeMode();
    }, []);

    const isDarkMode =
        themeMode === "system" ? systemColorScheme === "dark" : themeMode === "dark";

    const changeThemeMode = async (nextMode) => {
        try {
        setThemeMode(nextMode);
        await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
        } catch (error) {
        console.log("SAVE THEME MODE ERROR:", error);
        }
    };

    const toggleThemeMode = async () => {
        const nextMode = isDarkMode ? "light" : "dark";
        await changeThemeMode(nextMode);
    };

    const value = useMemo(
        () => ({
        themeMode,
        isDarkMode,
        themeModeLoading,
        changeThemeMode,
        toggleThemeMode,
        }),
        [themeMode, isDarkMode, themeModeLoading]
    );

    return (
        <ThemeModeContext.Provider value={value}>
        {children}
        </ThemeModeContext.Provider>
    );
    }

    export function useAppThemeMode() {
    return useContext(ThemeModeContext);
}