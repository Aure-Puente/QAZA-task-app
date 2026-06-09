//Importaciones:
import { useMemo, useState } from "react";
import {
  Alert,
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
export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { register, authLoading } = useAuth();

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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Atención", "Completá todos los campos.");
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert("Atención", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    const result = await register({
      name: name.trim(),
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

                <Text variant="headlineMedium" style={styles.title}>
                  Crear cuenta
                </Text>

                <Text variant="bodyMedium" style={styles.subtitle}>
                  Registrá un usuario para acceder al espacio de gestión del equipo.
                </Text>

                <View style={styles.form}>
                  <TextInput
                    label="Nombre"
                    mode="outlined"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    contentStyle={styles.inputContent}
                    left={<TextInput.Icon icon="account-outline" />}
                    textColor={palette.text}
                    theme={inputTheme}
                  />

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

                  <View style={styles.helperBox}>
                    <Text style={styles.helperText}>
                      Usá una contraseña de al menos 6 caracteres.
                    </Text>
                  </View>

                  <Button
                    mode="contained"
                    style={styles.registerButton}
                    contentStyle={styles.registerButtonContent}
                    buttonColor={palette.primary}
                    textColor="#FFFFFF"
                    labelStyle={styles.registerButtonLabel}
                    onPress={handleRegister}
                    loading={authLoading}
                    disabled={authLoading}
                    icon="account-plus-outline"
                  >
                    Registrarme
                  </Button>

                  <Button
                    mode="text"
                    onPress={() => navigation.goBack()}
                    disabled={authLoading}
                    textColor={palette.textSecondary}
                    style={styles.loginLink}
                    labelStyle={styles.loginLinkLabel}
                  >
                    Ya tengo cuenta
                  </Button>
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
    case "auth/email-already-in-use":
      return "Ese email ya está registrado.";
    case "auth/invalid-email":
      return "El email no es válido.";
    case "auth/weak-password":
      return "La contraseña es demasiado débil.";
    default:
      return "Ocurrió un error al crear la cuenta.";
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
      borderRadius: 28,
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
      paddingHorizontal: 22,
      paddingTop: 28,
      paddingBottom: 18,
    },

    title: {
      textAlign: "center",
      color: palette.text,
      fontWeight: "900",
      marginBottom: 8,
    },

    subtitle: {
      textAlign: "center",
      color: palette.textSecondary,
      lineHeight: 22,
      marginBottom: 24,
      paddingHorizontal: 6,
    },

    form: {
      marginTop: 4,
    },

    input: {
      marginBottom: 14,
      backgroundColor: palette.inputBg,
    },

    inputOutline: {
      borderRadius: 16,
    },

    inputContent: {
      minHeight: 54,
      color: palette.text,
    },

    helperBox: {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#FAF8F5",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: -2,
      marginBottom: 14,
    },

    helperText: {
      fontSize: 12.5,
      color: palette.textSecondary,
      lineHeight: 18,
      fontWeight: "600",
    },

    registerButton: {
      marginTop: 6,
      borderRadius: 16,
    },

    registerButtonContent: {
      height: 52,
    },

    registerButtonLabel: {
      fontSize: 16,
      fontWeight: "800",
    },

    loginLink: {
      marginTop: 8,
      alignSelf: "center",
    },

    loginLinkLabel: {
      fontSize: 14,
      fontWeight: "700",
    },
  });
}