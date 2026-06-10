//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMemo } from "react";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useAppThemeMode } from "../context/ThemeModeContext";

//JS:
export default function ProfileScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { user, logout, authLoading } = useAuth();
    const { isDarkMode, themeMode, toggleThemeMode, changeThemeMode } =
        useAppThemeMode();

    const custom = theme.custom || {};

    const palette = useMemo(
        () => ({
            background: theme.colors.background,
            surface: theme.colors.surface,
            primary: theme.colors.primary,
            text: theme.colors.onBackground,
            textSecondary: custom.textSecondary || theme.colors.onSurfaceVariant,
            textMuted: custom.textMuted || theme.colors.onSurfaceVariant,
            border: custom.border || theme.colors.outline,
            softBg: custom.softBg || theme.colors.surfaceVariant,
            card: custom.card || theme.colors.surface,
            danger: custom.danger || theme.colors.error,
            shadow: custom.shadow || "#000000",
        }),
        [theme, custom]
    );

    const styles = useMemo(
        () => createStyles(palette, isDarkMode),
        [palette, isDarkMode]
    );

    const handleLogout = async () => {
        await logout();
    };

    const currentThemeIcon = isDarkMode
        ? "moon-waning-crescent"
        : "white-balance-sunny";

    const themeButtonLabel = isDarkMode
        ? "Cambiar a tema claro"
        : "Cambiar a tema oscuro";

    const themeButtonIcon = isDarkMode
        ? "white-balance-sunny"
        : "moon-waning-crescent";

    return (
        <View style={styles.screen}>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={palette.background}
            />

            <View style={styles.backgroundShapeTop} />
            <View style={styles.backgroundShapeBottom} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: insets.top + 8,
                        paddingBottom: 118 + insets.bottom,
                    },
                ]}
            >
                <View style={styles.container}>
                    <View style={styles.headerBlock}>
                        <Text variant="headlineMedium" style={styles.title}>
                            Perfil
                        </Text>

                        <Text variant="bodyMedium" style={styles.subtitle}>
                            Consultá tu información, administrá tu sesión y personalizá la apariencia.
                        </Text>
                    </View>

                    <Card style={styles.card}>
                        <Card.Content style={styles.cardContent}>
                            <View style={styles.avatarWrap}>
                                <View style={styles.avatarCircle}>
                                    <MaterialCommunityIcons
                                        name="account-outline"
                                        size={38}
                                        color={palette.primary}
                                    />
                                </View>
                            </View>

                            <Text variant="titleLarge" style={styles.name}>
                                {user?.name || "Usuario"}
                            </Text>

                            <Text variant="bodyMedium" style={styles.email}>
                                {user?.email || "-"}
                            </Text>

                            <View style={styles.infoBox}>
                                <MaterialCommunityIcons
                                    name="information-outline"
                                    size={16}
                                    color={palette.textMuted}
                                />

                                <Text style={styles.infoText}>
                                    Estás usando tu cuenta para gestionar tareas, notas y objetivos del equipo.
                                </Text>
                            </View>

                            <View style={styles.themeBox}>
                                <View style={styles.themeIconCircle}>
                                    <MaterialCommunityIcons
                                        name={currentThemeIcon}
                                        size={22}
                                        color={palette.primary}
                                    />
                                </View>

                                <View style={styles.themeTextWrap}>
                                    <Text style={styles.themeTitle}>Apariencia</Text>

                                    <Text style={styles.themeText}>
                                        Tema actual:{" "}
                                        <Text style={styles.themeStrong}>
                                            {isDarkMode ? "Oscuro" : "Claro"}
                                        </Text>
                                    </Text>
                                </View>
                            </View>

                            <Button
                                mode="contained"
                                onPress={toggleThemeMode}
                                style={styles.themeButton}
                                contentStyle={styles.themeButtonContent}
                                labelStyle={styles.themeButtonLabel}
                                buttonColor={palette.primary}
                                textColor="#FFFFFF"
                                icon={themeButtonIcon}
                            >
                                {themeButtonLabel}
                            </Button>

                            {themeMode !== "system" ? (
                                <Button
                                    mode="text"
                                    onPress={() => changeThemeMode("system")}
                                    textColor={palette.textSecondary}
                                    style={styles.systemThemeButton}
                                    labelStyle={styles.systemThemeButtonLabel}
                                    icon="cellphone-cog"
                                >
                                    Usar tema del sistema
                                </Button>
                            ) : null}

                            <Button
                                mode="outlined"
                                onPress={handleLogout}
                                style={styles.logoutButton}
                                contentStyle={styles.logoutButtonContent}
                                labelStyle={styles.logoutButtonLabel}
                                loading={authLoading}
                                disabled={authLoading}
                                textColor={palette.danger}
                                icon="logout"
                            >
                                Cerrar sesión
                            </Button>
                        </Card.Content>
                    </Card>
                </View>
            </ScrollView>
        </View>
    );
}

function createStyles(palette, isDarkMode) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: palette.background,
        },

        scrollContent: {
            flexGrow: 1,
        },

        container: {
            paddingHorizontal: 16,
        },

        backgroundShapeTop: {
            position: "absolute",
            top: -120,
            right: -70,
            width: 240,
            height: 240,
            borderRadius: 120,
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.12)"
                : "rgba(209, 107, 24, 0.10)",
        },

        backgroundShapeBottom: {
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: isDarkMode
                ? "rgba(209, 107, 24, 0.10)"
                : "rgba(240, 138, 43, 0.08)",
        },

        headerBlock: {
            marginBottom: 16,
        },

        title: {
            color: palette.text,
            fontWeight: "800",
            marginBottom: 8,
        },

        subtitle: {
            color: palette.textSecondary,
            lineHeight: 21,
            maxWidth: 340,
        },

        card: {
            borderRadius: 24,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            elevation: 3,
            shadowColor: palette.shadow,
            shadowOpacity: isDarkMode ? 0.22 : 0.08,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
        },

        cardContent: {
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 20,
            alignItems: "center",
        },

        avatarWrap: {
            marginBottom: 16,
        },

        avatarCircle: {
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: palette.softBg,
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: "center",
            justifyContent: "center",
        },

        name: {
            fontWeight: "800",
            color: palette.text,
            textAlign: "center",
            marginBottom: 6,
        },

        email: {
            color: palette.textSecondary,
            textAlign: "center",
            marginBottom: 18,
        },

        infoBox: {
            width: "100%",
            flexDirection: "row",
            gap: 8,
            alignItems: "flex-start",
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#FAFBFA",
            borderWidth: 1,
            borderColor: palette.border,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 14,
            marginBottom: 14,
        },

        infoText: {
            flex: 1,
            fontSize: 12.5,
            color: palette.textSecondary,
            lineHeight: 18,
        },

        themeBox: {
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: palette.softBg,
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 13,
            marginBottom: 14,
        },

        themeIconCircle: {
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.14)"
                : "rgba(209, 107, 24, 0.12)",
            borderWidth: 1,
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.26)"
                : "rgba(209, 107, 24, 0.22)",
            alignItems: "center",
            justifyContent: "center",
        },

        themeTextWrap: {
            flex: 1,
        },

        themeTitle: {
            fontSize: 14,
            fontWeight: "800",
            color: palette.text,
            marginBottom: 3,
        },

        themeText: {
            fontSize: 12.5,
            color: palette.textSecondary,
            lineHeight: 18,
        },

        themeStrong: {
            fontWeight: "800",
            color: palette.primary,
        },

        themeButton: {
            width: "100%",
            borderRadius: 16,
            marginBottom: 6,
        },

        themeButtonContent: {
            height: 50,
        },

        themeButtonLabel: {
            fontSize: 15,
            fontWeight: "800",
        },

        systemThemeButton: {
            marginBottom: 10,
        },

        systemThemeButtonLabel: {
            fontSize: 13,
            fontWeight: "700",
        },

        logoutButton: {
            width: "100%",
            borderRadius: 16,
            borderColor: isDarkMode ? "rgba(255,107,107,0.32)" : "#F0C7C2",
            marginTop: 4,
        },

        logoutButtonContent: {
            height: 50,
        },

        logoutButtonLabel: {
            fontSize: 15,
            fontWeight: "700",
        },
    });
}