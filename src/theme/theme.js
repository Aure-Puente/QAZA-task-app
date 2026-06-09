//Theme:
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { COLORS } from "./colors";

export const appLightTheme = {
    ...MD3LightTheme,
    roundness: 16,
    dark: false,
    colors: {
        ...MD3LightTheme.colors,

        primary: COLORS.light.primary,
        secondary: COLORS.light.primaryLight,

        background: COLORS.light.background,
        surface: COLORS.light.surface,
        surfaceVariant: COLORS.light.softBg,

        error: COLORS.light.danger,
        outline: COLORS.light.border,
        outlineVariant: COLORS.light.outline,

        onPrimary: "#FFFFFF",
        onSecondary: "#FFFFFF",
        onBackground: COLORS.light.text,
        onSurface: COLORS.light.text,
        onSurfaceVariant: COLORS.light.textSecondary,

        inverseSurface: COLORS.dark.surface,
        inverseOnSurface: COLORS.dark.text,
        inversePrimary: COLORS.dark.primary,
    },

    custom: {
        ...COLORS.light,
        brand: COLORS.brand,
    },
};

export const appDarkTheme = {
    ...MD3DarkTheme,
    roundness: 16,
    dark: true,
    colors: {
        ...MD3DarkTheme.colors,

        primary: COLORS.dark.primary,
        secondary: COLORS.dark.primaryLight,

        background: COLORS.dark.background,
        surface: COLORS.dark.surface,
        surfaceVariant: COLORS.dark.softBg,

        error: COLORS.dark.danger,
        outline: COLORS.dark.border,
        outlineVariant: COLORS.dark.outline,

        onPrimary: "#FFFFFF",
        onSecondary: "#251A12",
        onBackground: COLORS.dark.text,
        onSurface: COLORS.dark.text,
        onSurfaceVariant: COLORS.dark.textSecondary,

        inverseSurface: COLORS.light.surface,
        inverseOnSurface: COLORS.light.text,
        inversePrimary: COLORS.light.primary,
    },

    custom: {
        ...COLORS.dark,
        brand: COLORS.brand,
    },
};

export const appTheme = appLightTheme;