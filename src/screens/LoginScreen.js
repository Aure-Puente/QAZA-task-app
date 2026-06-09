//Importaciones:
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

//JS:
export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login, authLoading } = useAuth();

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
      outline: custom.outline || theme.colors.outlineVariant || theme.colors.outline,
      softBg: custom.softBg || theme.colors.surfaceVariant,
      card: custom.card || theme.colors.surface,
      inputBg: custom.inputBg || theme.colors.surface,
      shadow: custom.shadow || "#000000",
    }),
    [theme, custom]
  );

  const styles = useMemo(
    () => createStyles(palette, isDarkMode),
    [palette, isDarkMode]
  );

  const inputTheme = useMemo(
    () => ({
      colors: {
        primary: palette.primary,
        outline: palette.border,
        background: palette.inputBg,
        onSurfaceVariant: palette.textSecondary,
        onSurface: palette.text,
        text: palette.text,
        placeholder: palette.textMuted,
      },
    }),
    [palette]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Atención", "Completá email y contraseña.");
      return;
    }

    const result = await login({
      email: email.trim(),
      password: password.trim(),
    });

    if (!result.ok) {
      Alert.alert("Error", getFirebaseErrorMessage(result.error));
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />

      <View style={styles.backgroundShapeTop} />
      <View style={styles.backgroundShapeBottom} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.container}>
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.logoWrapper}>
                  <View style={styles.logoShadow}>
                    <View style={styles.logoCard}>
                      <Image
                        source={require("../../assets/logo.jpeg")}
                        style={styles.logo}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                </View>

                <Text variant="headlineMedium" style={styles.title}>
                  QAZA
                </Text>

                <Text variant="bodyMedium" style={styles.subtitle}>
                  Iniciá sesión para organizar tareas, notas, objetivos y recursos
                  del equipo.
                </Text>

                <View style={styles.form}>
                  <TextInput
                    label="Email"
                    mode="outlined"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    contentStyle={styles.inputContent}
                    left={<TextInput.Icon icon="email-outline" />}
                    textColor={palette.text}
                    theme={inputTheme}
                  />

                  <TextInput
                    label="Contraseña"
                    mode="outlined"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    contentStyle={styles.inputContent}
                    left={<TextInput.Icon icon="lock-outline" />}
                    textColor={palette.text}
                    theme={inputTheme}
                  />

                  <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={authLoading}
                    disabled={authLoading}
                    style={styles.loginButton}
                    contentStyle={styles.loginButtonContent}
                    buttonColor={palette.primary}
                    textColor="#FFFFFF"
                    labelStyle={styles.loginButtonLabel}
                    icon="login"
                  >
                    Ingresar
                  </Button>

                  <Button
                    mode="text"
                    onPress={() => navigation.navigate("Register")}
                    disabled={authLoading}
                    textColor={palette.textSecondary}
                    style={styles.registerButton}
                    labelStyle={styles.registerButtonLabel}
                  >
                    Crear cuenta
                  </Button>
                </View>

                <View style={styles.footerPill}>
                  <View style={styles.statusDot} />

                  <Text style={styles.footerText}>
                    Espacio de trabajo interno
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function getFirebaseErrorMessage(error) {
  const code = error?.code;

  switch (code) {
    case "auth/invalid-email":
      return "El email no es válido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email o contraseña incorrectos.";
    default:
      return "No se pudo iniciar sesión.";
  }
}

function createStyles(palette, isDarkMode) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },

    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },

    scrollContent: {
      flexGrow: 1,
    },

    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 22,
      paddingVertical: 24,
    },

    backgroundShapeTop: {
      position: "absolute",
      top: -120,
      right: -70,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: isDarkMode
        ? "rgba(240, 138, 43, 0.08)"
        : "rgba(209, 107, 24, 0.06)",
    },

    backgroundShapeBottom: {
      position: "absolute",
      bottom: -100,
      left: -60,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: isDarkMode
        ? "rgba(240, 138, 43, 0.055)"
        : "rgba(209, 107, 24, 0.045)",
    },

    card: {
      borderRadius: 30,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      elevation: 3,
      shadowColor: palette.shadow,
      shadowOpacity: isDarkMode ? 0.2 : 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
    },

    cardContent: {
      paddingHorizontal: 24,
      paddingTop: 30,
      paddingBottom: 22,
    },

    logoWrapper: {
      alignItems: "center",
      marginBottom: 20,
    },

    logoShadow: {
      width: 132,
      height: 132,
      borderRadius: 34,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDarkMode
        ? "rgba(255,255,255,0.035)"
        : "#FAF8F5",
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.shadow,
      shadowOpacity: isDarkMode ? 0.24 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },

    logoCard: {
      width: 104,
      height: 104,
      borderRadius: 26,
      overflow: "hidden",
      backgroundColor: palette.primary,
    },

    logo: {
      width: "100%",
      height: "100%",
      borderRadius: 26,
    },

    title: {
      textAlign: "center",
      color: palette.text,
      fontWeight: "900",
      fontSize: 30,
      lineHeight: 36,
      marginBottom: 10,
    },

    subtitle: {
      textAlign: "center",
      color: palette.textSecondary,
      lineHeight: 23,
      fontSize: 15,
      marginBottom: 28,
      paddingHorizontal: 4,
    },

    form: {
      marginTop: 2,
    },

    input: {
      marginBottom: 14,
      backgroundColor: palette.inputBg,
    },

    inputOutline: {
      borderRadius: 17,
    },

    inputContent: {
      minHeight: 56,
      color: palette.text,
      fontSize: 15,
    },

    loginButton: {
      marginTop: 8,
      borderRadius: 17,
    },

    loginButtonContent: {
      height: 54,
    },

    loginButtonLabel: {
      fontSize: 16,
      fontWeight: "800",
    },

    registerButton: {
      marginTop: 10,
      alignSelf: "center",
    },

    registerButtonLabel: {
      fontSize: 14,
      fontWeight: "800",
    },

    footerPill: {
      alignSelf: "center",
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: isDarkMode
        ? "rgba(255,255,255,0.03)"
        : "rgba(250,248,245,0.9)",
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 13,
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