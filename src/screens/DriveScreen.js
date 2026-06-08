//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
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
        id: "produccion",
        title: "Producción",
        description: "Accedé a la carpeta de producción del equipo.",
        icon: "sprout",
        color: "#16A34A",
        soft: "rgba(22, 163, 74, 0.12)",
        border: "rgba(22, 163, 74, 0.24)",
        url: "https://drive.google.com/drive/folders/1tvQv4bstuOGmDYQk2g-3wrHx_LyiebrF",
    },
    {
        id: "redes",
        title: "Redes",
        description: "Materiales, archivos y recursos relacionados a redes.",
        icon: "access-point-network",
        color: "#7C3AED",
        soft: "rgba(124, 58, 237, 0.12)",
        border: "rgba(124, 58, 237, 0.22)",
        url: "https://drive.google.com/drive/folders/16WRUGZIk1QyK60nvJw2oHyH1uNjQcL5n",
    },
    {
        id: "general",
        title: "General",
        description: "Carpeta general con documentos compartidos.",
        icon: "folder-google-drive",
        color: "#2563EB",
        soft: "rgba(37, 99, 235, 0.12)",
        border: "rgba(37, 99, 235, 0.22)",
        url: "https://drive.google.com/drive/folders/1N0EH_ypn7tI3sdduSBG863Su_lRDAprE",
    },
];

export default function DriveScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

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
            <StatusBar barStyle="dark-content" backgroundColor="#F4F8F1" />

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
                            color={theme.colors.primary}
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
                    {DRIVE_FOLDERS.map((folder) => (
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
                                                backgroundColor: folder.soft,
                                                borderColor: folder.border,
                                            },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name={folder.icon}
                                            size={24}
                                            color={folder.color}
                                        />
                                    </View>

                                    <View style={styles.folderTextWrap}>
                                        <Text variant="titleMedium" style={styles.folderTitle}>
                                            {folder.title}
                                        </Text>

                                        <Text style={styles.folderDescription}>
                                            {folder.description}
                                        </Text>
                                    </View>

                                    <View style={styles.openIconWrap}>
                                        <MaterialCommunityIcons
                                            name="open-in-new"
                                            size={21}
                                            color="#667085"
                                        />
                                    </View>
                                </Card.Content>
                            </Card>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F4F8F1",
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
        maxWidth: 340,
    },

    infoPanel: {
        position: "relative",
        overflow: "hidden",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "rgba(255, 255, 255, 0.68)",
        borderWidth: 1,
        borderColor: "rgba(227, 236, 217, 0.85)",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 18,
    },

    infoAccent: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
        backgroundColor: "#4E7A28",
        opacity: 0.75,
    },

    infoIconCircle: {
        width: 58,
        height: 58,
        borderRadius: 22,
        backgroundColor: "#F6F9F2",
        borderWidth: 1,
        borderColor: "#DDEAD1",
        alignItems: "center",
        justifyContent: "center",
    },

    infoTextWrap: {
        flex: 1,
    },

    infoEyebrow: {
        fontSize: 11.5,
        color: "#4E7A28",
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 3,
    },

    infoTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#1F2937",
        marginBottom: 4,
    },

    infoText: {
        fontSize: 13,
        color: "#667085",
        lineHeight: 19,
    },

    sectionHeader: {
        marginBottom: 12,
    },

    sectionTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: "#234015",
        marginBottom: 3,
    },

    sectionSubtitle: {
        fontSize: 13,
        color: "#667085",
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
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E3ECD9",
        elevation: 2,
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
        color: "#1F2937",
        marginBottom: 4,
    },

    folderDescription: {
        fontSize: 13,
        color: "#667085",
        lineHeight: 19,
    },

    openIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 14,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#ECEFF3",
        alignItems: "center",
        justifyContent: "center",
    },
});