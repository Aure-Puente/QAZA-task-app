import { MD3LightTheme } from "react-native-paper";
import { COLORS } from "./colors";

export const appTheme = {
    ...MD3LightTheme,
    roundness: 16,
    colors: {
        ...MD3LightTheme.colors,
        primary: COLORS.primary,
        secondary: COLORS.primaryLight,
        background: COLORS.background,
        surface: COLORS.surface,
        error: COLORS.danger,
        outline: COLORS.border,
        onSurface: COLORS.text,
        onBackground: COLORS.text,
    },
};