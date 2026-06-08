//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StatusBar, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

//JS:
export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout, authLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8F1" />

      <View style={styles.backgroundShapeTop} />
      <View style={styles.backgroundShapeBottom} />

      <View style={styles.container}>
        <View style={styles.headerBlock}>
          <Text variant="headlineMedium" style={styles.title}>
            Perfil
          </Text>

          <Text variant="bodyMedium" style={styles.subtitle}>
            Consultá tu información y administrá tu sesión.
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={38}
                  color={theme.colors.primary}
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
                color="#6B7280"
              />
              <Text style={styles.infoText}>
                Estás usando tu cuenta para gestionar tareas del equipo.
              </Text>
            </View>

            <Button
              mode="outlined"
              onPress={handleLogout}
              style={styles.logoutButton}
              contentStyle={styles.logoutButtonContent}
              labelStyle={styles.logoutButtonLabel}
              loading={authLoading}
              disabled={authLoading}
              textColor="#B42318"
              icon="logout"
            >
              Cerrar sesión
            </Button>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F8F1",
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

  headerBlock: {
    marginBottom: 16,
  },

  title: {
    color: "#234015",
    fontWeight: "800",
    marginBottom: 8,
  },

  subtitle: {
    color: "#5E6E57",
    lineHeight: 21,
    maxWidth: 320,
  },

  card: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    elevation: 3,
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
    backgroundColor: "#F6F9F2",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 6,
  },

  email: {
    color: "#667085",
    textAlign: "center",
    marginBottom: 18,
  },

  infoBox: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#FAFBFA",
    borderWidth: 1,
    borderColor: "#ECEFF3",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 18,
  },

  infoText: {
    flex: 1,
    fontSize: 12.5,
    color: "#667085",
    lineHeight: 18,
  },

  logoutButton: {
    width: "100%",
    borderRadius: 16,
    borderColor: "#F0C7C2",
  },

  logoutButtonContent: {
    height: 50,
  },

  logoutButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
});