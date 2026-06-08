//Importaciones:
import { useState } from "react";
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
} from "react-native-paper";
import { useAuth } from "../context/AuthContext";

//JS:
export default function LoginScreen({ navigation }) {
  const { login, authLoading } = useAuth();

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
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8F1" />

      <View style={styles.backgroundShapeTop} />
      <View style={styles.backgroundShapeBottom} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.container}>
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.logoWrapper}>
                  <View style={styles.logoCircle}>
                    <Image
                      source={require("../../assets/logo.png")}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                <Text variant="headlineMedium" style={styles.title}>
                  Cannabis ConCiencia
                </Text>

                <Text variant="bodyMedium" style={styles.subtitle}>
                  Iniciá sesión para organizar las tareas del equipo
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
                    theme={{
                      colors: {
                        primary: "#4E7A28",
                        outline: "#C9D8BF",
                        background: "#FFFFFF",
                      },
                    }}
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
                    theme={{
                      colors: {
                        primary: "#4E7A28",
                        outline: "#C9D8BF",
                        background: "#FFFFFF",
                      },
                    }}
                  />

                  <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={authLoading}
                    disabled={authLoading}
                    style={styles.loginButton}
                    contentStyle={styles.loginButtonContent}
                    buttonColor="#4E7A28"
                    labelStyle={styles.loginButtonLabel}
                  >
                    Ingresar
                  </Button>

                  <Button
                    mode="text"
                    onPress={() => navigation.navigate("Register")}
                    disabled={authLoading}
                    textColor="#4E7A28"
                    style={styles.registerButton}
                    labelStyle={styles.registerButtonLabel}
                  >
                    Crear cuenta
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

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  screen: {
    flex: 1,
    backgroundColor: "#F4F8F1",
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
    backgroundColor: "rgba(78, 122, 40, 0.08)",
  },

  backgroundShapeBottom: {
    position: "absolute",
    bottom: -100,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(78, 122, 40, 0.06)",
  },

  card: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    elevation: 3,
  },

  cardContent: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 18,
  },

  logoWrapper: {
    alignItems: "center",
    marginBottom: 18,
  },

  logoCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: "#F7FAF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E3ECD9",
  },

  logo: {
    width: 94,
    height: 94,
  },

  title: {
    textAlign: "center",
    color: "#234015",
    fontWeight: "800",
    marginBottom: 8,
  },

  subtitle: {
    textAlign: "center",
    color: "#5E6E57",
    lineHeight: 22,
    marginBottom: 26,
    paddingHorizontal: 6,
  },

  form: {
    marginTop: 4,
  },

  input: {
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
  },

  inputOutline: {
    borderRadius: 16,
  },

  inputContent: {
    paddingVertical: 4,
  },

  loginButton: {
    marginTop: 8,
    borderRadius: 16,
  },

  loginButtonContent: {
    height: 52,
  },

  loginButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },

  registerButton: {
    marginTop: 8,
    alignSelf: "center",
  },

  registerButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});