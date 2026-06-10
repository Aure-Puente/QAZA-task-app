//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMemo, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    View,
} from "react-native";
import {
    Button,
    Card,
    Dialog,
    Portal,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NOTE_CATEGORIES, getNoteCategoryByKey } from "../constants/noteCategories";
import { useAuth } from "../context/AuthContext";
import { createNote, updateNote } from "../services/noteService";

//JS:
export default function NoteFormScreen({ navigation, route }) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

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
        success: custom.success || "#2E7D32",
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

    const note = route?.params?.note || null;
    const isEditing = !!note?.id;

    const [title, setTitle] = useState(note?.title || "");
    const [categoryKey, setCategoryKey] = useState(
        note?.categoryKey || NOTE_CATEGORIES[0].key
    );
    const [text, setText] = useState(note?.text || "");
    const [saving, setSaving] = useState(false);

    const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);

    const selectedCategory = getNoteCategoryByKey(categoryKey, isDarkMode);

    const handleSave = async () => {
        if (!title.trim()) {
        Alert.alert("Atención", "El título es obligatorio.");
        return;
        }

        if (!categoryKey) {
        Alert.alert("Atención", "Seleccioná una categoría.");
        return;
        }

        if (!text.trim()) {
        Alert.alert("Atención", "El texto de la nota es obligatorio.");
        return;
        }

        try {
        setSaving(true);

        if (isEditing) {
            await updateNote(note.id, {
            title: title.trim(),
            categoryKey,
            text: text.trim(),
            updatedBy: user?.uid || "",
            updatedByName: user?.name || user?.email || "Usuario",
            });
        } else {
            await createNote({
            title: title.trim(),
            categoryKey,
            text: text.trim(),
            createdBy: user?.uid || "",
            createdByName: user?.name || user?.email || "Usuario",
            });
        }

        setSuccessVisible(true);
        } catch (error) {
        console.log("SAVE NOTE ERROR:", error);
        Alert.alert(
            "Error",
            isEditing ? "No se pudo actualizar la nota." : "No se pudo crear la nota."
        );
        } finally {
        setSaving(false);
        }
    };

    const handleCloseSuccess = () => {
        setSuccessVisible(false);
        navigation.goBack();
    };

    const handleSelectCategory = (item) => {
        setCategoryKey(item.key);
        setCategoryDialogVisible(false);
    };

    return (
        <>
        <View style={styles.screen}>
            <StatusBar
            barStyle={isDarkMode ? "light-content" : "dark-content"}
            backgroundColor={palette.background}
            />

            <View style={styles.backgroundShapeTop} />
            <View style={styles.backgroundShapeBottom} />

            <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
            <ScrollView
                contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: insets.top + 8, paddingBottom: 32 + insets.bottom },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerBlock}>
                <Text variant="headlineMedium" style={styles.title}>
                    {isEditing ? "Editar nota" : "Crear nota"}
                </Text>

                <Text variant="bodyMedium" style={styles.subtitle}>
                    {isEditing
                    ? "Actualizá el contenido de la nota compartida."
                    : "Creá una nota para compartirla con todo el equipo."}
                </Text>
                </View>

                <Card style={styles.card}>
                <Card.Content style={styles.cardContent}>
                    <TextInput
                    label="Título"
                    mode="outlined"
                    value={title}
                    onChangeText={setTitle}
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    contentStyle={styles.inputContent}
                    left={<TextInput.Icon icon="format-title" />}
                    textColor={palette.text}
                    theme={inputTheme}
                    />

                    <Text style={styles.fieldLabel}>Categoría</Text>

                    <Pressable
                    onPress={() => setCategoryDialogVisible(true)}
                    style={({ pressed }) => [
                        styles.categorySelector,
                        pressed && styles.categorySelectorPressed,
                    ]}
                    >
                    <View style={styles.categorySelectorLeft}>
                        <View
                        style={[
                            styles.categoryIconWrap,
                            {
                            backgroundColor: selectedCategory.soft,
                            borderColor: selectedCategory.border,
                            },
                        ]}
                        >
                        <MaterialCommunityIcons
                            name={selectedCategory.icon}
                            size={18}
                            color={selectedCategory.color}
                        />
                        </View>

                        <View style={styles.categoryTextWrap}>
                        <Text style={styles.categorySelectorLabel}>
                            Seleccionada
                        </Text>

                        <Text
                            style={[
                            styles.categorySelectorValue,
                            { color: selectedCategory.color },
                            ]}
                        >
                            {selectedCategory.label}
                        </Text>
                        </View>
                    </View>

                    <View style={styles.chevronBadge}>
                        <MaterialCommunityIcons
                        name="chevron-down"
                        size={22}
                        color={palette.textMuted}
                        />
                    </View>
                    </Pressable>

                    <TextInput
                    label="Texto"
                    mode="outlined"
                    value={text}
                    onChangeText={setText}
                    multiline
                    numberOfLines={10}
                    style={styles.textArea}
                    outlineStyle={styles.inputOutline}
                    contentStyle={styles.textAreaContent}
                    left={<TextInput.Icon icon="note-text-outline" />}
                    textColor={palette.text}
                    theme={inputTheme}
                    />

                    <View style={styles.infoBox}>
                    <MaterialCommunityIcons
                        name="information-outline"
                        size={16}
                        color={palette.textMuted}
                    />

                    <Text style={styles.infoText}>
                        Esta nota será visible para todos los usuarios del equipo y
                        cualquiera podrá editarla.
                    </Text>
                    </View>

                    <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving}
                    style={styles.saveButton}
                    contentStyle={styles.saveButtonContent}
                    labelStyle={styles.saveButtonLabel}
                    buttonColor={palette.primary}
                    textColor="#FFFFFF"
                    icon={isEditing ? "content-save-outline" : "plus"}
                    >
                    {isEditing ? "Guardar cambios" : "Guardar nota"}
                    </Button>

                    <Button
                    mode="text"
                    onPress={() => navigation.goBack()}
                    disabled={saving}
                    textColor={palette.textSecondary}
                    style={styles.cancelButton}
                    >
                    Cancelar
                    </Button>
                </Card.Content>
                </Card>
            </ScrollView>
            </KeyboardAvoidingView>
        </View>

        <Portal>
            <Dialog
            visible={categoryDialogVisible}
            onDismiss={() => setCategoryDialogVisible(false)}
            style={styles.categoryDialog}
            >
            <Dialog.Title style={styles.categoryDialogTitle}>
                Seleccionar categoría
            </Dialog.Title>

            <Dialog.ScrollArea style={styles.categoryDialogScrollArea}>
                <ScrollView
                style={styles.categoryDialogScroll}
                contentContainerStyle={styles.categoryDialogContent}
                showsVerticalScrollIndicator={false}
                >
                {NOTE_CATEGORIES.map((item) => {
                    const category = getNoteCategoryByKey(item.key, isDarkMode);
                    const selected = category.key === categoryKey;

                    return (
                        <Pressable
                            key={category.key}
                            onPress={() => handleSelectCategory(category)}
                            style={({ pressed }) => [
                                styles.categoryOption,
                                {
                                    backgroundColor: selected
                                        ? category.soft
                                        : isDarkMode
                                        ? "rgba(255,255,255,0.025)"
                                        : "#FFFFFF",
                                    borderColor: selected ? category.border : palette.border,
                                },
                                pressed && styles.categoryOptionPressed,
                            ]}
                        >
                            <View
                                style={[
                                    styles.categoryOptionIcon,
                                    {
                                        backgroundColor: category.soft,
                                        borderColor: category.border,
                                    },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={category.icon}
                                    size={18}
                                    color={category.color}
                                />
                            </View>

                            <Text
                                style={[
                                    styles.categoryOptionText,
                                    selected && { color: category.color },
                                ]}
                            >
                                {category.label}
                            </Text>

                            {selected ? (
                                <MaterialCommunityIcons
                                    name="check-circle"
                                    size={20}
                                    color={category.color}
                                />
                            ) : null}
                        </Pressable>
                    );
                })}
                </ScrollView>
            </Dialog.ScrollArea>

            <Dialog.Actions>
                <Button
                onPress={() => setCategoryDialogVisible(false)}
                textColor={palette.primary}
                >
                Cerrar
                </Button>
            </Dialog.Actions>
            </Dialog>

            <Dialog
            visible={successVisible}
            onDismiss={handleCloseSuccess}
            style={styles.successDialog}
            >
            <Dialog.Content style={styles.successDialogContent}>
                <View style={styles.successIconCircle}>
                <MaterialCommunityIcons name="check-bold" size={30} color="#FFFFFF" />
                </View>

                <Text variant="titleLarge" style={styles.successTitle}>
                {isEditing ? "Nota actualizada" : "Nota creada"}
                </Text>

                <Text variant="bodyMedium" style={styles.successText}>
                {isEditing
                    ? "Los cambios se guardaron correctamente."
                    : "La nota se guardó correctamente."}
                </Text>

                <Button
                mode="contained"
                onPress={handleCloseSuccess}
                style={styles.successButton}
                contentStyle={styles.successButtonContent}
                buttonColor={palette.primary}
                textColor="#FFFFFF"
                >
                Continuar
                </Button>
            </Dialog.Content>
            </Dialog>
        </Portal>
        </>
    );
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
        shadowOpacity: isDarkMode ? 0.18 : 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        },

        cardContent: {
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 18,
        },

        input: {
        backgroundColor: palette.inputBg,
        marginBottom: 14,
        },

        inputOutline: {
        borderRadius: 16,
        },

        inputContent: {
        minHeight: 54,
        color: palette.text,
        },

        fieldLabel: {
        fontSize: 13,
        fontWeight: "800",
        color: palette.text,
        marginBottom: 8,
        },

        categorySelector: {
        minHeight: 62,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.inputBg,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        },

        categorySelectorPressed: {
        opacity: 0.9,
        },

        categorySelectorLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
        },

        categoryIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        },

        categoryTextWrap: {
        flex: 1,
        },

        categorySelectorLabel: {
        fontSize: 11.5,
        color: palette.textSecondary,
        fontWeight: "600",
        marginBottom: 2,
        },

        categorySelectorValue: {
        fontSize: 14.5,
        fontWeight: "800",
        },

        chevronBadge: {
        width: 34,
        height: 34,
        borderRadius: 13,
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#F8F7F5",
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: "center",
        justifyContent: "center",
        },

        textArea: {
        backgroundColor: palette.inputBg,
        marginBottom: 14,
        minHeight: 200,
        },

        textAreaContent: {
        minHeight: 190,
        paddingTop: 12,
        color: palette.text,
        },

        infoBox: {
        width: "100%",
        flexDirection: "row",
        gap: 8,
        alignItems: "flex-start",
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#FAF8F5",
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14,
        marginBottom: 16,
        },

        infoText: {
        flex: 1,
        fontSize: 12.5,
        color: palette.textSecondary,
        lineHeight: 18,
        },

        saveButton: {
        borderRadius: 16,
        },

        saveButtonContent: {
        height: 50,
        },

        saveButtonLabel: {
        fontSize: 15,
        fontWeight: "700",
        },

        cancelButton: {
        marginTop: 6,
        },

        categoryDialog: {
        borderRadius: 24,
        backgroundColor: palette.card,
        },

        categoryDialogTitle: {
        fontWeight: "800",
        color: palette.text,
        },

        categoryDialogScrollArea: {
        paddingHorizontal: 0,
        maxHeight: 430,
        },

        categoryDialogScroll: {
        maxHeight: 420,
        },

        categoryDialogContent: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        gap: 10,
        },

        categoryOption: {
        minHeight: 58,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        },

        categoryOptionPressed: {
        opacity: 0.9,
        },

        categoryOptionIcon: {
        width: 38,
        height: 38,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        },

        categoryOptionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "800",
        color: palette.text,
        },

        successDialog: {
        borderRadius: 24,
        backgroundColor: palette.card,
        },

        successDialogContent: {
        alignItems: "center",
        paddingTop: 24,
        paddingBottom: 18,
        },

        successIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: palette.success,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
        },

        successTitle: {
        fontWeight: "800",
        color: palette.text,
        textAlign: "center",
        marginBottom: 8,
        },

        successText: {
        color: palette.textSecondary,
        textAlign: "center",
        lineHeight: 21,
        marginBottom: 18,
        },

        successButton: {
        width: "100%",
        borderRadius: 16,
        },

        successButtonContent: {
        height: 48,
        },
    });
}