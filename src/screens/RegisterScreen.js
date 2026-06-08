//Importaciones:
import { useState } from "react";
import { Alert, StatusBar, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Text,
  TextInput,
} from "react-native-paper";
import { useAuth } from "../context/AuthContext";

//JS:
export default function RegisterScreen({ navigation }) {
  const { register, authLoading } = useAuth();

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
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8F1" />

      <View style={styles.backgroundShapeTop} />
      <View style={styles.backgroundShapeBottom} />

      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="headlineMedium" style={styles.title}>
              Crear cuenta
            </Text>

            <Text variant="bodyMedium" style={styles.subtitle}>
              Registrate para empezar a organizar las tareas del equipo
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
                theme={{
                  colors: {
                    primary: "#4E7A28",
                    outline: "#C9D8BF",
                    background: "#FFFFFF",
                  },
                }}
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

              <Text style={styles.helperText}>
                Usá una contraseña de al menos 6 caracteres.
              </Text>

              <Button
                mode="contained"
                style={styles.registerButton}
                contentStyle={styles.registerButtonContent}
                buttonColor="#4E7A28"
                labelStyle={styles.registerButtonLabel}
                onPress={handleRegister}
                loading={authLoading}
                disabled={authLoading}
              >
                Registrarme
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                disabled={authLoading}
                textColor="#4E7A28"
                style={styles.loginLink}
                labelStyle={styles.loginLinkLabel}
              >
                Ya tengo cuenta
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F8F1",
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
    paddingHorizontal: 8,
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

  helperText: {
    fontSize: 13,
    color: "#6B7865",
    marginTop: -2,
    marginBottom: 14,
    marginLeft: 4,
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
    fontWeight: "700",
  },

  loginLink: {
    marginTop: 8,
    alignSelf: "center",
  },

  loginLinkLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});