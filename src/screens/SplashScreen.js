//Importaciones:
import { useEffect, useRef } from "react";
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
        <StatusBar barStyle="dark-content" backgroundColor="#F4F8F1" />

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
            <View style={styles.logoCard}>
                <Image
                source={require("../../assets/logo.png")}
                style={styles.logo}
                resizeMode="contain"
                />
            </View>

            <Text variant="headlineMedium" style={styles.title}>
                Cannabis ConCiencia
            </Text>

            <Text variant="bodyMedium" style={styles.subtitle}>
                Organizando tareas, notas y recursos del equipo.
            </Text>

            <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
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

    const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F4F8F1",
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
        backgroundColor: "rgba(78, 122, 40, 0.10)",
    },

    backgroundShapeMiddle: {
        position: "absolute",
        top: "34%",
        left: -120,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: "rgba(111, 161, 60, 0.07)",
    },

    backgroundShapeBottom: {
        position: "absolute",
        bottom: -120,
        right: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: "rgba(78, 122, 40, 0.07)",
    },

    logoOuterGlow: {
        position: "absolute",
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: "rgba(78, 122, 40, 0.08)",
    },

    content: {
        alignItems: "center",
        justifyContent: "center",
    },

    logoCard: {
        width: 165,
        height: 165,
        borderRadius: 44,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E3ECD9",
        alignItems: "center",
        justifyContent: "center",
        elevation: 5,
        shadowColor: "#234015",
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        marginBottom: 24,
        padding: 10,
    },

    logo: {
        width: 140,
        height: 140,
    },

    title: {
        textAlign: "center",
        color: "#234015",
        fontWeight: "900",
        marginBottom: 8,
    },

    subtitle: {
        textAlign: "center",
        color: "#5E6E57",
        lineHeight: 22,
        maxWidth: 310,
        marginBottom: 24,
    },

    loadingBox: {
        minHeight: 42,
        borderRadius: 999,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E3ECD9",
        paddingHorizontal: 14,
        paddingVertical: 9,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
    },

    loadingText: {
        fontSize: 12.5,
        color: "#5E6E57",
        fontWeight: "700",
    },

    footer: {
        alignItems: "center",
        paddingHorizontal: 20,
    },

    footerPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: "rgba(255,255,255,0.76)",
        borderWidth: 1,
        borderColor: "#E3ECD9",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },

    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#4E7A28",
    },

    footerText: {
        fontSize: 12,
        color: "#667085",
        fontWeight: "700",
    },
});