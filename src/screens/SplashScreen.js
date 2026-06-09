//Importaciones:
import { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    Easing,
    Image,
    StatusBar,
    StyleSheet,
    View,
} from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

//JS:
export default function SplashScreen() {
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

    const logoScale = useRef(new Animated.Value(0.88)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const contentTranslate = useRef(new Animated.Value(14)).current;
    const pulseScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
        Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 12,
            bounciness: 7,
        }),
        Animated.timing(contentTranslate, {
            toValue: 0,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }),
        ]).start();

        const pulse = Animated.loop(
        Animated.sequence([
            Animated.timing(pulseScale, {
            toValue: 1.07,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
            }),
        ])
        );

        pulse.start();

        return () => pulse.stop();
    }, [contentTranslate, logoOpacity, logoScale, pulseScale]);

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
        <StatusBar
            barStyle={isDarkMode ? "light-content" : "dark-content"}
            backgroundColor={palette.background}
        />

        <View style={styles.backgroundShapeTop} />
        <View style={styles.backgroundShapeMiddle} />
        <View style={styles.backgroundShapeBottom} />

        <View style={styles.container}>
            <Animated.View
            style={[
                styles.logoOuterGlow,
                {
                transform: [{ scale: pulseScale }],
                },
            ]}
            />

            <Animated.View
            style={[
                styles.content,
                {
                opacity: logoOpacity,
                transform: [
                    { scale: logoScale },
                    { translateY: contentTranslate },
                ],
                },
            ]}
            >
            <View style={styles.logoShadow}>
                <View style={styles.logoCard}>
                <Image
                    source={require("../../assets/logo.jpeg")}
                    style={styles.logo}
                    resizeMode="cover"
                />
                </View>
            </View>

            <Text variant="headlineMedium" style={styles.title}>
                QAZA
            </Text>

            <Text variant="bodyMedium" style={styles.subtitle}>
                Organizando tareas, notas, objetivos y recursos del equipo.
            </Text>

            <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={palette.primary} />

                <Text style={styles.loadingText}>Cargando aplicación...</Text>
            </View>
            </Animated.View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.footerPill}>
            <View style={styles.statusDot} />

            <Text style={styles.footerText}>Espacio de trabajo interno</Text>
            </View>
        </View>
        </View>
    );
    }

    function createStyles(palette, isDarkMode) {
    return StyleSheet.create({
        screen: {
        flex: 1,
        backgroundColor: palette.background,
        overflow: "hidden",
        },

        container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        },

        backgroundShapeTop: {
        position: "absolute",
        top: -130,
        right: -80,
        width: 270,
        height: 270,
        borderRadius: 135,
        backgroundColor: isDarkMode
            ? "rgba(240, 138, 43, 0.08)"
            : "rgba(209, 107, 24, 0.065)",
        },

        backgroundShapeMiddle: {
        position: "absolute",
        top: "34%",
        left: -120,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: isDarkMode
            ? "rgba(240, 138, 43, 0.045)"
            : "rgba(209, 107, 24, 0.045)",
        },

        backgroundShapeBottom: {
        position: "absolute",
        bottom: -120,
        right: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: isDarkMode
            ? "rgba(240, 138, 43, 0.055)"
            : "rgba(209, 107, 24, 0.045)",
        },

        logoOuterGlow: {
        position: "absolute",
        width: 210,
        height: 210,
        borderRadius: 105,
        backgroundColor: isDarkMode
            ? "rgba(240, 138, 43, 0.08)"
            : "rgba(209, 107, 24, 0.07)",
        },

        content: {
        alignItems: "center",
        justifyContent: "center",
        },

        logoShadow: {
        width: 178,
        height: 178,
        borderRadius: 48,
        backgroundColor: isDarkMode
            ? "rgba(255,255,255,0.035)"
            : "#FAF8F5",
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: "center",
        justifyContent: "center",
        elevation: 5,
        shadowColor: palette.shadow,
        shadowOpacity: isDarkMode ? 0.24 : 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        marginBottom: 26,
        },

        logoCard: {
        width: 138,
        height: 138,
        borderRadius: 34,
        overflow: "hidden",
        backgroundColor: palette.primary,
        },

        logo: {
        width: "100%",
        height: "100%",
        borderRadius: 34,
        },

        title: {
        textAlign: "center",
        color: palette.text,
        fontWeight: "900",
        fontSize: 31,
        lineHeight: 38,
        marginBottom: 8,
        },

        subtitle: {
        textAlign: "center",
        color: palette.textSecondary,
        lineHeight: 22,
        fontSize: 15,
        maxWidth: 320,
        marginBottom: 24,
        },

        loadingBox: {
        minHeight: 44,
        borderRadius: 999,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: 15,
        paddingVertical: 9,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        elevation: 2,
        shadowColor: palette.shadow,
        shadowOpacity: isDarkMode ? 0.18 : 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        },

        loadingText: {
        fontSize: 12.5,
        color: palette.textSecondary,
        fontWeight: "800",
        },

        footer: {
        alignItems: "center",
        paddingHorizontal: 20,
        },

        footerPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: isDarkMode
            ? "rgba(255,255,255,0.035)"
            : "rgba(250,248,245,0.9)",
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        },

        statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: palette.primary,
        },

        footerText: {
        fontSize: 12,
        color: palette.textSecondary,
        fontWeight: "800",
        },
    });
}