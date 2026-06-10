//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useMemo, useState } from "react";
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
    ActivityIndicator,
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
import { getAllUsers } from "../services/userService";
import { createWeeklyObjective } from "../services/weeklyObjectiveService";

//JS:
function getDateFromRouteParam(value) {
    if (!value) return new Date();

    const [year, month, day] = String(value).split("-");
    if (!year || !month || !day) return new Date();

    const date = new Date(Number(year), Number(month) - 1, Number(day));

    return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toDateKey(date) {
    if (!date) return "";

    const d = new Date(date);
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getWeekStart(date) {
    const safeDate = new Date(date);
    safeDate.setHours(0, 0, 0, 0);

    const day = safeDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    safeDate.setDate(safeDate.getDate() + diff);

    return safeDate;
}

function getWeekEnd(date) {
    const start = getWeekStart(date);
    const end = new Date(start);

    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return end;
}

function formatDateLabel(date) {
    if (!date) return "";

    return new Intl.DateTimeFormat("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
    }).format(date);
}

function formatRangeLabel(startDate, endDate) {
    if (!startDate || !endDate) return "Rango no seleccionado";

    const start = formatDateLabel(startDate);

    const end = new Intl.DateTimeFormat("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(endDate);

    return `${start} - ${end}`;
}

function getUserLabel(userItem) {
    return userItem?.name || userItem?.email || "Usuario";
}

function getInitial(name) {
    const safeName = String(name || "").trim();
    return safeName ? safeName.charAt(0).toUpperCase() : "?";
}

export default function CreateWeeklyObjectiveScreen({ navigation, route }) {
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
            danger: custom.danger || theme.colors.error || "#B42318",
            success: custom.success || "#2E7D32",
            warning: custom.warning || "#B7791F",
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

    const initialDate = useMemo(
        () => getDateFromRouteParam(route?.params?.selectedDate),
        [route?.params?.selectedDate]
    );

    const [weekBaseDate, setWeekBaseDate] = useState(initialDate);

    const startDate = useMemo(() => getWeekStart(weekBaseDate), [weekBaseDate]);
    const endDate = useMemo(() => getWeekEnd(weekBaseDate), [weekBaseDate]);

    const [title, setTitle] = useState("");
    const [saving, setSaving] = useState(false);

    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);

    const [selectedUsers, setSelectedUsers] = useState([]);
    const [assignDialogVisible, setAssignDialogVisible] = useState(false);

    const [categoryKey, setCategoryKey] = useState(NOTE_CATEGORIES[0].key);
    const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);

    const [successVisible, setSuccessVisible] = useState(false);

    const selectedCategory = getNoteCategoryByKey(categoryKey);

    useEffect(() => {
        if (user?.uid) {
            setSelectedUsers([
                {
                    uid: String(user.uid),
                    name: user?.name || "Yo",
                    email: user?.email || "",
                },
            ]);
        }
    }, [user]);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setUsersLoading(true);

            const data = await getAllUsers();
            const safeUsers = Array.isArray(data) ? data : [];

            setUsers(safeUsers);
        } catch (error) {
            console.log("LOAD USERS ERROR:", error);
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    };

    const selectableUsers = useMemo(() => {
        const normalizedDbUsers = (users || [])
            .map((item) => ({
                uid: String(item?.uid || item?.id || ""),
                name: item?.name || item?.nombre || "",
                email: item?.email || "",
            }))
            .filter((item) => item.uid);

        const selfUser = user?.uid
            ? {
                  uid: String(user.uid),
                  name: user?.name || "Yo",
                  email: user?.email || "",
              }
            : null;

        const merged = selfUser
            ? [selfUser, ...normalizedDbUsers]
            : normalizedDbUsers;

        return merged.filter(
            (item, index, arr) =>
                item?.uid &&
                arr.findIndex((u) => String(u?.uid) === String(item.uid)) === index
        );
    }, [users, user]);

    const selectedUsersText = useMemo(() => {
        if (usersLoading) return "Cargando usuarios...";
        if (selectedUsers.length === 0) return "Seleccionar responsables";

        if (selectedUsers.length === 1) {
            return getUserLabel(selectedUsers[0]);
        }

        return `${selectedUsers.length} responsables seleccionados`;
    }, [selectedUsers, usersLoading]);

    const handlePreviousWeek = () => {
        setWeekBaseDate((prev) => {
            const next = new Date(prev);
            next.setDate(prev.getDate() - 7);
            return next;
        });
    };

    const handleNextWeek = () => {
        setWeekBaseDate((prev) => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + 7);
            return next;
        });
    };

    const handleToggleUser = (selectedUser) => {
        setSelectedUsers((prev) => {
            const exists = prev.some(
                (item) => String(item.uid) === String(selectedUser.uid)
            );

            if (exists) {
                return prev.filter(
                    (item) => String(item.uid) !== String(selectedUser.uid)
                );
            }

            return [
                ...prev,
                {
                    uid: String(selectedUser.uid),
                    name: selectedUser.name || selectedUser.email || "Usuario",
                    email: selectedUser.email || "",
                },
            ];
        });
    };

    const handleSelectCategory = (item) => {
        setCategoryKey(item.key);
        setCategoryDialogVisible(false);
    };

    const handleCreateObjective = async () => {
        if (!title.trim()) {
            Alert.alert("Atención", "El título es obligatorio.");
            return;
        }

        if (selectedUsers.length === 0) {
            Alert.alert("Atención", "Elegí al menos un responsable.");
            return;
        }

        if (!categoryKey) {
            Alert.alert("Atención", "Elegí una categoría.");
            return;
        }

        try {
            setSaving(true);

            const firstAssignedUser = selectedUsers[0];

            await createWeeklyObjective({
                title: title.trim(),

                categoryKey,
                categoryLabel: selectedCategory.label,

                startDate: toDateKey(startDate),
                endDate: toDateKey(endDate),
                startDateTimestamp: startDate.getTime(),
                endDateTimestamp: endDate.getTime(),

                createdBy: user?.uid ? String(user.uid) : "",
                createdByName: user?.name || user?.email || "Usuario",

                assignedTo: String(firstAssignedUser.uid),
                assignedToName: getUserLabel(firstAssignedUser),

                assignedUsers: selectedUsers.map((item) => ({
                    uid: String(item.uid),
                    name: item.name || item.email || "Usuario",
                    email: item.email || "",
                })),
            });

            setTitle("");
            setCategoryKey(NOTE_CATEGORIES[0].key);

            setSelectedUsers(
                user?.uid
                    ? [
                          {
                              uid: String(user.uid),
                              name: user?.name || "Yo",
                              email: user?.email || "",
                          },
                      ]
                    : []
            );

            setSuccessVisible(true);
        } catch (error) {
            console.log("CREATE WEEKLY OBJECTIVE ERROR:", error);
            Alert.alert("Error", "No se pudo crear el objetivo semanal.");
        } finally {
            setSaving(false);
        }
    };

    const handleCloseSuccess = () => {
        setSuccessVisible(false);
        navigation.goBack();
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
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            {
                                paddingTop: insets.top + 8,
                                paddingBottom: 32 + insets.bottom,
                            },
                        ]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.headerBlock}>
                            <Text variant="headlineMedium" style={styles.title}>
                                Nuevo objetivo semanal
                            </Text>

                            <Text variant="bodyMedium" style={styles.subtitle}>
                                Creá un objetivo para una semana, asignale responsables y categoría.
                            </Text>
                        </View>

                        <View style={styles.rangeInfoCard}>
                            <View style={styles.rangeIcon}>
                                <MaterialCommunityIcons
                                    name="calendar-range-outline"
                                    size={22}
                                    color={palette.primary}
                                />
                            </View>

                            <View style={styles.rangeTextWrap}>
                                <Text style={styles.rangeLabel}>Rango semanal</Text>

                                <Text style={styles.rangeValue}>
                                    {formatRangeLabel(startDate, endDate)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.weekControlsRow}>
                            <Pressable
                                onPress={handlePreviousWeek}
                                style={({ pressed }) => [
                                    styles.weekControlButton,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name="chevron-left"
                                    size={20}
                                    color={palette.primary}
                                />

                                <Text style={styles.weekControlText}>
                                    Semana anterior
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleNextWeek}
                                style={({ pressed }) => [
                                    styles.weekControlButton,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <Text style={styles.weekControlText}>
                                    Semana siguiente
                                </Text>

                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={20}
                                    color={palette.primary}
                                />
                            </Pressable>
                        </View>

                        <Card style={styles.card}>
                            <Card.Content style={styles.cardContent}>
                                <TextInput
                                    label="Título del objetivo"
                                    mode="outlined"
                                    value={title}
                                    onChangeText={setTitle}
                                    style={styles.input}
                                    outlineStyle={styles.inputOutline}
                                    contentStyle={styles.inputContent}
                                    left={<TextInput.Icon icon="flag-outline" />}
                                    textColor={palette.text}
                                    theme={inputTheme}
                                />

                                <View style={styles.sectionHeader}>
                                    <View style={styles.sectionTitleRow}>
                                        <View style={styles.sectionIconWrap}>
                                            <MaterialCommunityIcons
                                                name="shape-outline"
                                                size={16}
                                                color={palette.primary}
                                            />
                                        </View>

                                        <Text variant="titleSmall" style={styles.label}>
                                            Categoría
                                        </Text>
                                    </View>

                                    <Text style={styles.sectionHint}>
                                        El color de la categoría se va a usar para mostrar la barra del objetivo.
                                    </Text>
                                </View>

                                <Pressable
                                    onPress={() => setCategoryDialogVisible(true)}
                                    style={({ pressed }) => [
                                        styles.selectorTrigger,
                                        pressed && styles.selectorTriggerPressed,
                                    ]}
                                >
                                    <View style={styles.selectorLeft}>
                                        <View
                                            style={[
                                                styles.selectorAvatar,
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

                                        <View style={styles.selectorTextWrap}>
                                            <Text style={styles.selectorLabel}>
                                                Categoría
                                            </Text>

                                            <Text
                                                style={[
                                                    styles.selectorValue,
                                                    { color: selectedCategory.color },
                                                ]}
                                            >
                                                {selectedCategory.label}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.chevronBadge}>
                                        <MaterialCommunityIcons
                                            name="chevron-right"
                                            size={20}
                                            color={palette.textMuted}
                                        />
                                    </View>
                                </Pressable>

                                <View style={styles.sectionHeader}>
                                    <View style={styles.sectionTitleRow}>
                                        <View style={styles.sectionIconWrap}>
                                            <MaterialCommunityIcons
                                                name="account-multiple-check-outline"
                                                size={16}
                                                color={palette.primary}
                                            />
                                        </View>

                                        <Text variant="titleSmall" style={styles.label}>
                                            Responsables
                                        </Text>
                                    </View>

                                    <Text style={styles.sectionHint}>
                                        Podés seleccionar una o varias personas para este objetivo.
                                    </Text>
                                </View>

                                <Pressable
                                    onPress={() => {
                                        if (!usersLoading) {
                                            setAssignDialogVisible(true);
                                        }
                                    }}
                                    style={({ pressed }) => [
                                        styles.selectorTrigger,
                                        pressed && styles.selectorTriggerPressed,
                                    ]}
                                >
                                    <View style={styles.selectorLeft}>
                                        <View style={styles.selectorAvatar}>
                                            <MaterialCommunityIcons
                                                name="account-multiple-outline"
                                                size={18}
                                                color={palette.primary}
                                            />
                                        </View>

                                        <View style={styles.selectorTextWrap}>
                                            <Text style={styles.selectorLabel}>
                                                Responsables
                                            </Text>

                                            <Text style={styles.selectorValue}>
                                                {selectedUsersText}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.chevronBadge}>
                                        {usersLoading ? (
                                            <ActivityIndicator
                                                size={16}
                                                color={palette.primary}
                                            />
                                        ) : (
                                            <MaterialCommunityIcons
                                                name="chevron-right"
                                                size={20}
                                                color={palette.textMuted}
                                            />
                                        )}
                                    </View>
                                </Pressable>

                                {selectedUsers.length > 0 ? (
                                    <View style={styles.selectedUsersWrap}>
                                        {selectedUsers.map((item) => (
                                            <View
                                                key={item.uid}
                                                style={styles.selectedUserChip}
                                            >
                                                <View style={styles.selectedUserInitial}>
                                                    <Text style={styles.selectedUserInitialText}>
                                                        {getInitial(getUserLabel(item))}
                                                    </Text>
                                                </View>

                                                <Text
                                                    style={styles.selectedUserName}
                                                    numberOfLines={1}
                                                >
                                                    {getUserLabel(item)}
                                                </Text>

                                                <Pressable
                                                    onPress={() => handleToggleUser(item)}
                                                    hitSlop={8}
                                                    style={styles.removeSelectedUserButton}
                                                >
                                                    <MaterialCommunityIcons
                                                        name="close"
                                                        size={14}
                                                        color={palette.textSecondary}
                                                    />
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                ) : null}

                                <View style={styles.infoBox}>
                                    <MaterialCommunityIcons
                                        name="information-outline"
                                        size={16}
                                        color={palette.textMuted}
                                    />

                                    <Text style={styles.infoText}>
                                        El objetivo se mostrará como una barra horizontal dentro del calendario, ocupando los días de la semana seleccionada.
                                    </Text>
                                </View>

                                <Button
                                    mode="contained"
                                    onPress={handleCreateObjective}
                                    loading={saving}
                                    disabled={saving}
                                    style={styles.saveButton}
                                    contentStyle={styles.saveButtonContent}
                                    labelStyle={styles.saveButtonLabel}
                                    buttonColor={palette.primary}
                                    textColor="#FFFFFF"
                                    icon="flag-plus-outline"
                                >
                                    Guardar objetivo
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
                    style={styles.selectDialog}
                >
                    <Dialog.Title style={styles.selectDialogTitle}>
                        Seleccionar categoría
                    </Dialog.Title>

                    <Dialog.ScrollArea style={styles.selectDialogScrollArea}>
                        <ScrollView
                            style={styles.selectScroll}
                            contentContainerStyle={styles.selectScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {NOTE_CATEGORIES.map((item) => {
                                const isSelected = item.key === categoryKey;

                                return (
                                    <Pressable
                                        key={item.key}
                                        onPress={() => handleSelectCategory(item)}
                                        style={({ pressed }) => [
                                            styles.optionItem,
                                            {
                                                backgroundColor: isSelected
                                                    ? item.soft
                                                    : isDarkMode
                                                      ? "rgba(255,255,255,0.025)"
                                                      : "#FFFFFF",
                                                borderColor: isSelected
                                                    ? item.border
                                                    : palette.border,
                                            },
                                            pressed && styles.optionItemPressed,
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.optionAvatar,
                                                {
                                                    backgroundColor: item.soft,
                                                    borderColor: item.border,
                                                },
                                            ]}
                                        >
                                            <MaterialCommunityIcons
                                                name={item.icon}
                                                size={18}
                                                color={item.color}
                                            />
                                        </View>

                                        <Text
                                            style={[
                                                styles.optionName,
                                                isSelected && { color: item.color },
                                            ]}
                                        >
                                            {item.label}
                                        </Text>

                                        {isSelected ? (
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={20}
                                                color={item.color}
                                            />
                                        ) : null}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Dialog.ScrollArea>
                </Dialog>

                <Dialog
                    visible={assignDialogVisible}
                    onDismiss={() => setAssignDialogVisible(false)}
                    style={styles.selectDialog}
                >
                    <Dialog.Title style={styles.selectDialogTitle}>
                        Seleccionar responsables
                    </Dialog.Title>

                    <Dialog.ScrollArea style={styles.selectDialogScrollArea}>
                        <ScrollView
                            style={styles.selectScroll}
                            contentContainerStyle={styles.selectScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {selectableUsers.length > 0 ? (
                                selectableUsers.map((item) => {
                                    const isSelected = selectedUsers.some(
                                        (selectedUser) =>
                                            String(selectedUser.uid) === String(item.uid)
                                    );

                                    return (
                                        <Pressable
                                            key={item.uid}
                                            onPress={() => handleToggleUser(item)}
                                            style={({ pressed }) => [
                                                styles.optionItem,
                                                isSelected && styles.optionItemSelected,
                                                pressed && styles.optionItemPressed,
                                            ]}
                                        >
                                            <View style={styles.optionAvatar}>
                                                <MaterialCommunityIcons
                                                    name={
                                                        isSelected
                                                            ? "account-check-outline"
                                                            : "account-outline"
                                                    }
                                                    size={18}
                                                    color={palette.primary}
                                                />
                                            </View>

                                            <View style={styles.optionTextWrap}>
                                                <Text style={styles.optionName}>
                                                    {String(item.uid) === String(user?.uid)
                                                        ? `${item.name || "Yo"} (Yo)`
                                                        : item.name ||
                                                          item.email ||
                                                          "Usuario"}
                                                </Text>

                                                {!!item.email ? (
                                                    <Text style={styles.optionEmail}>
                                                        {item.email}
                                                    </Text>
                                                ) : null}
                                            </View>

                                            {isSelected ? (
                                                <MaterialCommunityIcons
                                                    name="check-circle"
                                                    size={20}
                                                    color={palette.primary}
                                                />
                                            ) : null}
                                        </Pressable>
                                    );
                                })
                            ) : (
                                <Text style={styles.emptyDialogText}>
                                    No hay usuarios disponibles.
                                </Text>
                            )}
                        </ScrollView>
                    </Dialog.ScrollArea>

                    <Dialog.Actions style={styles.assignDialogActions}>
                        <Button
                            onPress={() => setSelectedUsers([])}
                            textColor={palette.textSecondary}
                            disabled={selectedUsers.length === 0}
                        >
                            Limpiar
                        </Button>

                        <Button
                            mode="contained"
                            onPress={() => setAssignDialogVisible(false)}
                            buttonColor={palette.primary}
                            textColor="#FFFFFF"
                            style={styles.assignDialogDoneButton}
                        >
                            Listo
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
                            <MaterialCommunityIcons
                                name="check-bold"
                                size={30}
                                color="#FFFFFF"
                            />
                        </View>

                        <Text variant="titleLarge" style={styles.successTitle}>
                            Objetivo creado
                        </Text>

                        <Text variant="bodyMedium" style={styles.successText}>
                            El objetivo semanal se guardó correctamente.
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

        pressed: {
            opacity: 0.86,
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
            fontWeight: "900",
            marginBottom: 8,
        },

        subtitle: {
            color: palette.textSecondary,
            lineHeight: 21,
            maxWidth: 345,
        },

        rangeInfoCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 13,
            marginBottom: 10,
            elevation: 2,
            shadowColor: palette.shadow,
            shadowOpacity: isDarkMode ? 0.16 : 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
        },

        rangeIcon: {
            width: 42,
            height: 42,
            borderRadius: 15,
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.11)"
                : "rgba(209, 107, 24, 0.08)",
            borderWidth: 1,
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.22)"
                : "rgba(209, 107, 24, 0.18)",
            alignItems: "center",
            justifyContent: "center",
        },

        rangeTextWrap: {
            flex: 1,
        },

        rangeLabel: {
            fontSize: 12,
            color: palette.textSecondary,
            fontWeight: "700",
            marginBottom: 2,
        },

        rangeValue: {
            fontSize: 15,
            fontWeight: "900",
            color: palette.text,
            textTransform: "capitalize",
            lineHeight: 20,
        },

        weekControlsRow: {
            flexDirection: "row",
            gap: 10,
            marginBottom: 16,
        },

        weekControlButton: {
            flex: 1,
            minHeight: 42,
            borderRadius: 15,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.035)"
                : "#FAF8F5",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            paddingHorizontal: 8,
        },

        weekControlText: {
            fontSize: 12,
            fontWeight: "800",
            color: palette.primary,
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

        sectionHeader: {
            marginTop: 2,
            marginBottom: 10,
        },

        sectionTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 5,
        },

        sectionIconWrap: {
            width: 28,
            height: 28,
            borderRadius: 10,
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.11)"
                : "rgba(209, 107, 24, 0.08)",
            borderWidth: 1,
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.22)"
                : "rgba(209, 107, 24, 0.18)",
            alignItems: "center",
            justifyContent: "center",
        },

        label: {
            fontWeight: "800",
            color: palette.text,
        },

        sectionHint: {
            fontSize: 12.5,
            color: palette.textSecondary,
            lineHeight: 18,
        },

        selectorTrigger: {
            minHeight: 62,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.inputBg,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },

        selectorTriggerPressed: {
            opacity: 0.9,
        },

        selectorLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
        },

        selectorAvatar: {
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.035)"
                : "#FAF8F5",
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: "center",
            justifyContent: "center",
        },

        selectorTextWrap: {
            flex: 1,
        },

        selectorLabel: {
            fontSize: 11.5,
            color: palette.textSecondary,
            fontWeight: "700",
            marginBottom: 2,
        },

        selectorValue: {
            fontSize: 14.5,
            fontWeight: "900",
            color: palette.text,
        },

        chevronBadge: {
            width: 32,
            height: 32,
            borderRadius: 12,
            backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.035)"
                : "#F8FAFC",
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: "center",
            justifyContent: "center",
        },

        selectedUsersWrap: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: -6,
            marginBottom: 16,
        },

        selectedUserChip: {
            maxWidth: "100%",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.10)"
                : "rgba(209, 107, 24, 0.08)",
            borderWidth: 1,
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.22)"
                : "rgba(209, 107, 24, 0.18)",
            borderRadius: 999,
            paddingLeft: 5,
            paddingRight: 8,
            paddingVertical: 5,
        },

        selectedUserInitial: {
            width: 22,
            height: 22,
            borderRadius: 999,
            backgroundColor: palette.primary,
            alignItems: "center",
            justifyContent: "center",
        },

        selectedUserInitialText: {
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "900",
        },

        selectedUserName: {
            maxWidth: 190,
            fontSize: 12.5,
            fontWeight: "800",
            color: palette.text,
        },

        removeSelectedUserButton: {
            width: 20,
            height: 20,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
        },

        infoBox: {
            width: "100%",
            flexDirection: "row",
            gap: 8,
            alignItems: "flex-start",
            backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.035)"
                : "#FAFBFA",
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
            fontWeight: "800",
        },

        cancelButton: {
            marginTop: 6,
        },

        selectDialog: {
            borderRadius: 24,
            backgroundColor: palette.card,
        },

        selectDialogTitle: {
            fontWeight: "800",
            color: palette.text,
        },

        selectDialogScrollArea: {
            paddingHorizontal: 0,
            maxHeight: 430,
        },

        selectScroll: {
            maxHeight: 420,
        },

        selectScrollContent: {
            paddingHorizontal: 18,
            paddingVertical: 8,
            gap: 10,
        },

        optionItem: {
            minHeight: 58,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.card,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },

        optionItemPressed: {
            opacity: 0.9,
        },

        optionItemSelected: {
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.10)"
                : "rgba(209, 107, 24, 0.08)",
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.22)"
                : "rgba(209, 107, 24, 0.18)",
        },

        optionAvatar: {
            width: 38,
            height: 38,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.035)"
                : "#FAF8F5",
            alignItems: "center",
            justifyContent: "center",
        },

        optionTextWrap: {
            flex: 1,
        },

        optionName: {
            flex: 1,
            fontSize: 14,
            fontWeight: "800",
            color: palette.text,
        },

        optionEmail: {
            fontSize: 12.5,
            color: palette.textSecondary,
            marginTop: 2,
        },

        emptyDialogText: {
            color: palette.textSecondary,
            textAlign: "center",
            paddingVertical: 20,
        },

        assignDialogActions: {
            paddingHorizontal: 16,
            paddingBottom: 14,
            justifyContent: "space-between",
        },

        assignDialogDoneButton: {
            borderRadius: 14,
            minWidth: 96,
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
            backgroundColor: palette.primary,
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