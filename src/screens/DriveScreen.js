//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMemo } from "react";
import {
    Linking,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    View,
} from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

//JS:
const DRIVE_FOLDERS = [
    {
        id: "administracion",
        title: "Administración",
        description: "Accedé a documentos, planillas y archivos administrativos.",
        icon: "briefcase-outline",

        color: "#C62828",
        soft: "rgba(198, 40, 40, 0.10)",
        border: "rgba(198, 40, 40, 0.22)",

        darkColor: "#FF8A80",
        darkSoft: "rgba(255, 138, 128, 0.14)",
        darkBorder: "rgba(255, 138, 128, 0.34)",

        url: "https://drive.google.com/drive/folders/1byoUnm-4pJZ45mmlgvKUq7PXosMTA_ni",
    },
    {
        id: "comunicacion",
        title: "Comunicación",
        description: "Materiales, recursos y contenidos del área de comunicación.",
        icon: "message-text-outline",

        color: "#7C3AED",
        soft: "rgba(124, 58, 237, 0.11)",
        border: "rgba(124, 58, 237, 0.24)",

        darkColor: "#C4B5FD",
        darkSoft: "rgba(196, 181, 253, 0.14)",
        darkBorder: "rgba(196, 181, 253, 0.34)",

        url: "https://drive.google.com/drive/folders/1MlTGhDRcjZGM4VAOTT514W8mwHro435U",
    },
    {
        id: "produccion",
        title: "Producción",
        description: "Accedé a archivos, recursos y materiales de producción.",
        icon: "package-variant-closed",

        color: "#D16B18",
        soft: "rgba(209, 107, 24, 0.11)",
        border: "rgba(209, 107, 24, 0.24)",

        darkColor: "#FDBA74",
        darkSoft: "rgba(253, 186, 116, 0.15)",
        darkBorder: "rgba(253, 186, 116, 0.36)",

        url: "https://drive.google.com/drive/folders/1O9PplReeUQIGwi0yoeRQt6kqUN2ztfSo",
    },
    {
        id: "produccion_estudiarq",
        title: "Producción EstudiARQ",
        description: "Accedé a materiales, recursos y archivos de producción de EstudiARQ.",
        icon: "book-open-page-variant-outline",

        color: "#CA8A04",
        soft: "rgba(202, 138, 4, 0.12)",
        border: "rgba(202, 138, 4, 0.25)",

        darkColor: "#FDE68A",
        darkSoft: "rgba(253, 230, 138, 0.15)",
        darkBorder: "rgba(253, 230, 138, 0.34)",

        url: "https://drive.google.com/drive/folders/1O9PplReeUQIGwi0yoeRQt6kqUN2ztfSo",
    },
    {
        id: "biblioteca",
        title: "Biblioteca",
        description: "Consultá recursos, referencias y material de consulta del equipo.",
        icon: "bookshelf",

        color: "#3B6478",
        soft: "rgba(59, 100, 120, 0.11)",
        border: "rgba(59, 100, 120, 0.24)",

        darkColor: "#9CCFE3",
        darkSoft: "rgba(156, 207, 227, 0.14)",
        darkBorder: "rgba(156, 207, 227, 0.34)",

        url: "https://drive.google.com/drive/folders/17U_9Lu0OrxKKtZQzPx3GgmuOIq2IbYgb",
    },
];

function getFolderColors(folder, isDarkMode) {
    return {
        color: isDarkMode ? folder.darkColor : folder.color,
        soft: isDarkMode ? folder.darkSoft : folder.soft,
        border: isDarkMode ? folder.darkBorder : folder.border,
    };
}

export default function DriveScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const isDarkMode = !!theme.dark;
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
            shadow: custom.shadow || "#000000",
        }),
        [theme, custom]
    );

    const styles = useMemo(
        () => createStyles(palette, isDarkMode),
        [palette, isDarkMode]
    );

    const handleOpenFolder = async (url) => {
        try {
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
            } else {
                console.log("No se puede abrir la URL:", url);
            }
        } catch (error) {
            console.log("OPEN DRIVE URL ERROR:", error);
        }
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
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
                    { paddingBottom: 130 + insets.bottom },
                ]}
            >
                <View style={styles.headerBlock}>
                    <Text variant="headlineMedium" style={styles.title}>
                        Drive
                    </Text>

                    <Text variant="bodyMedium" style={styles.subtitle}>
                        Accedé rápidamente a las carpetas compartidas del equipo.
                    </Text>
                </View>

                <View style={styles.infoPanel}>
                    <View style={styles.infoAccent} />

                    <View style={styles.infoIconCircle}>
                        <MaterialCommunityIcons
                            name="google-drive"
                            size={28}
                            color={isDarkMode ? "#FDBA74" : palette.primary}
                        />
                    </View>

                    <View style={styles.infoTextWrap}>
                        <Text style={styles.infoEyebrow}>Acceso rápido</Text>

                        <Text style={styles.infoTitle}>Carpetas externas</Text>

                        <Text style={styles.infoText}>
                            Las opciones de abajo abren carpetas específicas de Google Drive
                            fuera de la app.
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Carpetas disponibles</Text>

                    <Text style={styles.sectionSubtitle}>
                        Tocá una carpeta para abrirla en Google Drive.
                    </Text>
                </View>

                <View style={styles.foldersList}>
                    {DRIVE_FOLDERS.map((folder) => {
                        const folderColors = getFolderColors(folder, isDarkMode);

                        return (
                            <Pressable
                                key={folder.id}
                                onPress={() => handleOpenFolder(folder.url)}
                                style={({ pressed }) => [
                                    styles.folderPressable,
                                    pressed && styles.folderPressablePressed,
                                ]}
                            >
                                <Card style={styles.folderCard}>
                                    <Card.Content style={styles.folderContent}>
                                        <View
                                            style={[
                                                styles.folderIconWrap,
                                                {
                                                    backgroundColor: folderColors.soft,
                                                    borderColor: folderColors.border,
                                                },
                                            ]}
                                        >
                                            <MaterialCommunityIcons
                                                name={folder.icon}
                                                size={24}
                                                color={folderColors.color}
                                            />
                                        </View>

                                        <View style={styles.folderTextWrap}>
                                            <Text
                                                variant="titleMedium"
                                                style={[
                                                    styles.folderTitle,
                                                    isDarkMode && {
                                                        color: folderColors.color,
                                                    },
                                                ]}
                                            >
                                                {folder.title}
                                            </Text>

                                            <Text style={styles.folderDescription}>
                                                {folder.description}
                                            </Text>
                                        </View>

                                        <View
                                            style={[
                                                styles.openIconWrap,
                                                isDarkMode && {
                                                    backgroundColor: folderColors.soft,
                                                    borderColor: folderColors.border,
                                                },
                                            ]}
                                        >
                                            <MaterialCommunityIcons
                                                name="open-in-new"
                                                size={21}
                                                color={
                                                    isDarkMode
                                                        ? folderColors.color
                                                        : palette.textMuted
                                                }
                                            />
                                        </View>
                                    </Card.Content>
                                </Card>
                            </Pressable>
                        );
                    })}
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
                ? "rgba(253, 186, 116, 0.08)"
                : "rgba(209, 107, 24, 0.07)",
        },

        backgroundShapeBottom: {
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: isDarkMode
                ? "rgba(196, 181, 253, 0.055)"
                : "rgba(209, 107, 24, 0.055)",
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

        infoPanel: {
            position: "relative",
            overflow: "hidden",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 16,
            marginBottom: 18,
            elevation: 2,
            shadowColor: palette.shadow,
            shadowOpacity: isDarkMode ? 0.16 : 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
        },

        infoAccent: {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: isDarkMode ? "#FDBA74" : palette.primary,
        },

        infoIconCircle: {
            width: 58,
            height: 58,
            borderRadius: 22,
            backgroundColor: isDarkMode
                ? "rgba(253, 186, 116, 0.14)"
                : "rgba(209, 107, 24, 0.08)",
            borderWidth: 1,
            borderColor: isDarkMode
                ? "rgba(253, 186, 116, 0.34)"
                : "rgba(209, 107, 24, 0.18)",
            alignItems: "center",
            justifyContent: "center",
        },

        infoTextWrap: {
            flex: 1,
            backgroundColor: "transparent",
        },

        infoEyebrow: {
            fontSize: 11.5,
            color: isDarkMode ? "#FDBA74" : palette.primary,
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginBottom: 3,
        },

        infoTitle: {
            fontSize: 16,
            fontWeight: "800",
            color: palette.text,
            marginBottom: 4,
        },

        infoText: {
            fontSize: 13,
            color: palette.textSecondary,
            lineHeight: 19,
        },

        sectionHeader: {
            marginBottom: 12,
        },

        sectionTitle: {
            fontSize: 17,
            fontWeight: "800",
            color: palette.text,
            marginBottom: 3,
        },

        sectionSubtitle: {
            fontSize: 13,
            color: palette.textSecondary,
        },

        foldersList: {
            gap: 12,
        },

        folderPressable: {
            borderRadius: 22,
        },

        folderPressablePressed: {
            opacity: 0.9,
            transform: [{ scale: 0.995 }],
        },

        folderCard: {
            borderRadius: 22,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            elevation: 2,
            shadowColor: palette.shadow,
            shadowOpacity: isDarkMode ? 0.18 : 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
        },

        folderContent: {
            paddingHorizontal: 16,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },

        folderIconWrap: {
            width: 52,
            height: 52,
            borderRadius: 18,
            borderWidth: 1,
            alignItems: "center",
            justifyContent: "center",
        },

        folderTextWrap: {
            flex: 1,
        },

        folderTitle: {
            fontWeight: "800",
            color: palette.text,
            marginBottom: 4,
        },

        folderDescription: {
            fontSize: 13,
            color: palette.textSecondary,
            lineHeight: 19,
        },

        openIconWrap: {
            width: 36,
            height: 36,
            borderRadius: 14,
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#F8F7F5",
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: "center",
            justifyContent: "center",
        },
    });
}