//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getNoteCategoryByKey, NOTE_CATEGORIES } from "../constants/noteCategories";
import { useAuth } from "../context/AuthContext";
import { getAllTasks } from "../services/taskService";
import { getAllWeeklyObjectives } from "../services/weeklyObjectiveService";

//JS:
function getDueDateFromTask(task) {
    if (task?.dueDateTimestamp) {
        const date = new Date(task.dueDateTimestamp);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (task?.dueDate) {
        const date = new Date(task.dueDate);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
}

function getDateFromKey(dateString) {
    if (!dateString) return null;

    const [year, month, day] = String(dateString).split("-");
    if (!year || !month || !day) return null;

    const date = new Date(Number(year), Number(month) - 1, Number(day));

    return Number.isNaN(date.getTime()) ? null : date;
}

function getStartDateFromObjective(objective) {
    if (objective?.startDateTimestamp) {
        const date = new Date(objective.startDateTimestamp);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (objective?.startDate) {
        return getDateFromKey(objective.startDate);
    }

    return null;
}

function getEndDateFromObjective(objective) {
    if (objective?.endDateTimestamp) {
        const date = new Date(objective.endDateTimestamp);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (objective?.endDate) {
        return getDateFromKey(objective.endDate);
    }

    return null;
}

function formatDateShort(date) {
    if (!date) return "Sin fecha";

    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function formatDateLong(date) {
    if (!date) return "Sin fecha asignada";

    return new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
}

function formatDateShortFromTask(task) {
    return formatDateShort(getDueDateFromTask(task));
}

function formatDateLongFromTask(task) {
    return formatDateLong(getDueDateFromTask(task));
}

function formatObjectiveRange(objective) {
    const startDate = getStartDateFromObjective(objective);
    const endDate = getEndDateFromObjective(objective);

    if (!startDate || !endDate) return "Sin rango asignado";

    const start = new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
    }).format(startDate);

    const end = new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(endDate);

    return `${start} - ${end}`;
}

function getInitials(name) {
    const safeName = String(name || "").trim();

    if (!safeName) return "?";

    return safeName.charAt(0).toUpperCase();
}

function normalizeResponsibleName(item) {
    if (!item) return "";

    if (typeof item === "string") return item;

    return item?.name || item?.nombre || item?.displayName || item?.email || "";
}

function getTaskResponsibleNames(task) {
    if (Array.isArray(task?.assignedUsers) && task.assignedUsers.length > 0) {
        const names = task.assignedUsers
            .map((item) => normalizeResponsibleName(item))
            .filter(Boolean);

        if (names.length > 0) return names;
    }

    if (task?.assignedToName) {
        return [task.assignedToName];
    }

    return ["Sin asignar"];
}

function getObjectiveResponsibleNames(objective) {
    if (Array.isArray(objective?.assignedUsers) && objective.assignedUsers.length > 0) {
        const names = objective.assignedUsers
            .map((item) => normalizeResponsibleName(item))
            .filter(Boolean);

        if (names.length > 0) return names;
    }

    if (objective?.assignedToName) {
        return [objective.assignedToName];
    }

    return ["Sin asignar"];
}

function getTaskResponsibleIds(task) {
    const ids = [];

    if (task?.assignedTo) {
        ids.push(String(task.assignedTo));
    }

    if (Array.isArray(task?.assignedUsers)) {
        task.assignedUsers.forEach((item) => {
            if (item?.uid) ids.push(String(item.uid));
            if (item?.id) ids.push(String(item.id));
            if (item?.userId) ids.push(String(item.userId));
        });
    }

    return [...new Set(ids)];
}

function getObjectiveResponsibleIds(objective) {
    const ids = [];

    if (objective?.assignedTo) {
        ids.push(String(objective.assignedTo));
    }

    if (Array.isArray(objective?.assignedUsers)) {
        objective.assignedUsers.forEach((item) => {
            if (item?.uid) ids.push(String(item.uid));
            if (item?.id) ids.push(String(item.id));
            if (item?.userId) ids.push(String(item.userId));
        });
    }

    return [...new Set(ids)];
}

function isTaskAssignedToUser(task, userId) {
    if (!userId) return false;

    const ids = getTaskResponsibleIds(task);
    return ids.some((id) => String(id) === String(userId));
}

function isObjectiveAssignedToUser(objective, userId) {
    if (!userId) return false;

    const ids = getObjectiveResponsibleIds(objective);
    return ids.some((id) => String(id) === String(userId));
}

function getTaskSortTime(task) {
    const dueDate = getDueDateFromTask(task);

    return (
        task?.updatedAt?.seconds ||
        task?.completedAt?.seconds ||
        dueDate?.getTime?.() / 1000 ||
        task?.createdAt?.seconds ||
        0
    );
}

function getObjectiveSortTime(objective) {
    const endDate = getEndDateFromObjective(objective);

    return (
        objective?.updatedAt?.seconds ||
        objective?.completedAt?.seconds ||
        endDate?.getTime?.() / 1000 ||
        objective?.createdAt?.seconds ||
        0
    );
}

export default function TaskHistoryScreen() {
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
            softBg: custom.softBg || theme.colors.surfaceVariant,
            card: custom.card || theme.colors.surface,
            success: custom.success || "#2E7D32",
            successSoft: custom.doneBg || "rgba(46,125,50,0.10)",
            successText: custom.doneText || "#2E7D32",
            shadow: custom.shadow || "#000000",
        }),
        [theme, custom]
    );

    const styles = useMemo(
        () => createStyles(palette, isDarkMode),
        [palette, isDarkMode]
    );

    const [tasks, setTasks] = useState([]);
    const [weeklyObjectives, setWeeklyObjectives] = useState([]);
    const [loading, setLoading] = useState(true);

    const [ownerFilter, setOwnerFilter] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);

    const loadHistoryData = useCallback(async () => {
        try {
            setLoading(true);

            const [tasksData, objectivesData] = await Promise.all([
                getAllTasks(),
                getAllWeeklyObjectives(),
            ]);

            setTasks(Array.isArray(tasksData) ? tasksData.filter(Boolean) : []);
            setWeeklyObjectives(
                Array.isArray(objectivesData) ? objectivesData.filter(Boolean) : []
            );
        } catch (error) {
            console.log("LOAD HISTORY DATA ERROR:", error);
            setTasks([]);
            setWeeklyObjectives([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (user?.uid) {
                loadHistoryData();
            }
        }, [user?.uid, loadHistoryData])
    );

    const completedTasks = useMemo(() => {
        return (tasks || [])
            .filter((task) => !!task?.completed)
            .sort((a, b) => getTaskSortTime(b) - getTaskSortTime(a));
    }, [tasks]);

    const completedObjectives = useMemo(() => {
        return (weeklyObjectives || [])
            .filter((objective) => !!objective?.completed)
            .sort((a, b) => getObjectiveSortTime(b) - getObjectiveSortTime(a));
    }, [weeklyObjectives]);

    const filteredTasks = useMemo(() => {
        return completedTasks.filter((task) => {
            if (ownerFilter === "mine") {
                if (!isTaskAssignedToUser(task, user?.uid)) return false;
            }

            if (ownerFilter === "others") {
                if (isTaskAssignedToUser(task, user?.uid)) return false;
            }

            if (categoryFilter) {
                if (String(task.categoryKey) !== String(categoryFilter)) return false;
            }

            return true;
        });
    }, [completedTasks, ownerFilter, categoryFilter, user?.uid]);

    const filteredObjectives = useMemo(() => {
        return completedObjectives.filter((objective) => {
            if (ownerFilter === "mine") {
                if (!isObjectiveAssignedToUser(objective, user?.uid)) return false;
            }

            if (ownerFilter === "others") {
                if (isObjectiveAssignedToUser(objective, user?.uid)) return false;
            }

            if (categoryFilter) {
                if (String(objective.categoryKey) !== String(categoryFilter)) return false;
            }

            return true;
        });
    }, [completedObjectives, ownerFilter, categoryFilter, user?.uid]);

    const historyItems = useMemo(() => {
        const taskItems = filteredTasks.map((task) => ({
            type: "task",
            id: `task-${task.id}`,
            sortTime: getTaskSortTime(task),
            data: task,
        }));

        const objectiveItems = filteredObjectives.map((objective) => ({
            type: "objective",
            id: `objective-${objective.id}`,
            sortTime: getObjectiveSortTime(objective),
            data: objective,
        }));

        return [...taskItems, ...objectiveItems].sort(
            (a, b) => b.sortTime - a.sortTime
        );
    }, [filteredTasks, filteredObjectives]);

    const selectedCategory = useMemo(() => {
        if (!categoryFilter) return null;

        return getNoteCategoryByKey(categoryFilter, isDarkMode);
    }, [categoryFilter, isDarkMode]);

    const hasActiveFilters = !!ownerFilter || !!categoryFilter;

    const handleToggleOwnerFilter = (value) => {
        setOwnerFilter((prev) => (prev === value ? null : value));
    };

    const handleSelectCategoryFilter = (categoryKey) => {
        setCategoryFilter((prev) => (prev === categoryKey ? null : categoryKey));
        setCategoryDialogVisible(false);
    };

    const handleClearFilters = () => {
        setOwnerFilter(null);
        setCategoryFilter(null);
    };

    const renderTaskCard = (task) => {
        const category = getNoteCategoryByKey(task.categoryKey, isDarkMode);
        const responsibleNames = getTaskResponsibleNames(task);

        return (
            <Card key={`task-${task.id}`} style={styles.taskCard}>
                <Card.Content style={styles.taskContent}>
                    <View style={styles.taskTop}>
                        <View
                          style={[
                              styles.taskAvatar,
                              {
                                  backgroundColor: category.color,
                              },
                          ]}
                      >
                          <Text
                              style={[
                                  styles.taskAvatarText,
                                  {
                                      color: category.textOnColor,
                                  },
                              ]}
                          >
                              {getInitials(responsibleNames[0])}
                          </Text>
                      </View>

                        <View style={styles.taskTitleWrap}>
                            <View style={styles.itemTypeRow}>
                                <MaterialCommunityIcons
                                    name="clipboard-check-outline"
                                    size={14}
                                    color={palette.textMuted}
                                />

                                <Text style={styles.itemTypeText}>Tarea completada</Text>
                            </View>

                            <Text
                                variant="titleMedium"
                                style={styles.taskTitle}
                                numberOfLines={2}
                            >
                                {task.title || "Sin título"}
                            </Text>

                            <Text style={styles.taskDateText} numberOfLines={1}>
                                {formatDateLongFromTask(task)}
                            </Text>
                        </View>

                        <View style={styles.doneBadge}>
                            <MaterialCommunityIcons
                                name="check-bold"
                                size={14}
                                color="#FFFFFF"
                            />
                        </View>
                    </View>

                    <View style={styles.chipsRow}>
                        <Chip
                            compact
                            style={[
                                styles.categoryChip,
                                {
                                    backgroundColor: category.soft,
                                    borderColor: category.border,
                                },
                            ]}
                            textStyle={[
                                styles.categoryChipText,
                                { color: category.color },
                            ]}
                            icon={() => (
                                <MaterialCommunityIcons
                                    name={category.icon}
                                    size={14}
                                    color={category.color}
                                />
                            )}
                        >
                            {category.label}
                        </Chip>

                        <View style={styles.completedChip}>
                            <MaterialCommunityIcons
                                name="check-circle-outline"
                                size={13}
                                color={palette.successText}
                            />

                            <Text style={styles.completedChipText}>Completada</Text>
                        </View>
                    </View>

                    {!!task.description ? (
                        <Text style={styles.taskDescription} numberOfLines={3}>
                            {task.description}
                        </Text>
                    ) : null}

                    <View style={styles.metaStack}>
                        <View style={styles.metaRow}>
                            <MaterialCommunityIcons
                                name="account-check-outline"
                                size={15}
                                color={palette.textMuted}
                            />

                            <Text style={styles.metaText}>
                                Responsable{" "}
                                <Text style={styles.metaStrong}>
                                    {responsibleNames.join(", ") || "Sin asignar"}
                                </Text>
                            </Text>
                        </View>

                        <View style={styles.metaRow}>
                            <MaterialCommunityIcons
                                name="account-edit-outline"
                                size={15}
                                color={palette.textMuted}
                            />

                            <Text style={styles.metaText}>
                                Creada por{" "}
                                <Text style={styles.metaStrong}>
                                    {task.createdByName || "Usuario"}
                                </Text>
                            </Text>
                        </View>

                        <View style={styles.metaRow}>
                            <MaterialCommunityIcons
                                name="calendar-month-outline"
                                size={15}
                                color={palette.textMuted}
                            />

                            <Text style={styles.metaText}>
                                Fecha{" "}
                                <Text style={styles.metaStrong}>
                                    {formatDateShortFromTask(task)}
                                </Text>
                            </Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    const renderObjectiveCard = (objective) => {
        const category = getNoteCategoryByKey(objective.categoryKey, isDarkMode);
        const responsibleNames = getObjectiveResponsibleNames(objective);

        return (
            <Card key={`objective-${objective.id}`} style={styles.taskCard}>
                <Card.Content style={styles.taskContent}>
                    <View style={styles.taskTop}>
                        <View
                            style={[
                                styles.taskAvatar,
                                {
                                    backgroundColor: category.color,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="flag-checkered"
                                size={22}
                                color={category.textOnColor}
                            />
                        </View>

                        <View style={styles.taskTitleWrap}>
                            <View style={styles.itemTypeRow}>
                                <MaterialCommunityIcons
                                    name="flag-checkered"
                                    size={14}
                                    color={palette.textMuted}
                                />

                                <Text style={styles.itemTypeText}>
                                    Objetivo semanal completado
                                </Text>
                            </View>

                            <Text
                                variant="titleMedium"
                                style={styles.taskTitle}
                                numberOfLines={2}
                            >
                                {objective.title || "Objetivo semanal"}
                            </Text>

                            <Text style={styles.taskDateText} numberOfLines={1}>
                                {formatObjectiveRange(objective)}
                            </Text>
                        </View>

                        <View style={styles.doneBadge}>
                            <MaterialCommunityIcons
                                name="check-bold"
                                size={14}
                                color="#FFFFFF"
                            />
                        </View>
                    </View>

                    <View style={styles.chipsRow}>
                        <Chip
                            compact
                            style={[
                                styles.categoryChip,
                                {
                                    backgroundColor: category.soft,
                                    borderColor: category.border,
                                },
                            ]}
                            textStyle={[
                                styles.categoryChipText,
                                { color: category.color },
                            ]}
                            icon={() => (
                                <MaterialCommunityIcons
                                    name={category.icon}
                                    size={14}
                                    color={category.color}
                                />
                            )}
                        >
                            {category.label}
                        </Chip>

                        <View style={styles.objectiveChip}>
                            <MaterialCommunityIcons
                                name="flag-checkered"
                                size={13}
                                color={palette.primary}
                            />

                            <Text style={styles.objectiveChipText}>
                                Objetivo semanal
                            </Text>
                        </View>

                        <View style={styles.completedChip}>
                            <MaterialCommunityIcons
                                name="check-circle-outline"
                                size={13}
                                color={palette.successText}
                            />

                            <Text style={styles.completedChipText}>Completado</Text>
                        </View>
                    </View>

                    <View style={styles.metaStack}>
                        <View style={styles.metaRow}>
                            <MaterialCommunityIcons
                                name="account-check-outline"
                                size={15}
                                color={palette.textMuted}
                            />

                            <Text style={styles.metaText}>
                                Responsable{" "}
                                <Text style={styles.metaStrong}>
                                    {responsibleNames.join(", ") || "Sin asignar"}
                                </Text>
                            </Text>
                        </View>

                        <View style={styles.metaRow}>
                            <MaterialCommunityIcons
                                name="account-edit-outline"
                                size={15}
                                color={palette.textMuted}
                            />

                            <Text style={styles.metaText}>
                                Creado por{" "}
                                <Text style={styles.metaStrong}>
                                    {objective.createdByName || "Usuario"}
                                </Text>
                            </Text>
                        </View>

                        <View style={styles.metaRow}>
                            <MaterialCommunityIcons
                                name="calendar-range-outline"
                                size={15}
                                color={palette.textMuted}
                            />

                            <Text style={styles.metaText}>
                                Rango{" "}
                                <Text style={styles.metaStrong}>
                                    {formatObjectiveRange(objective)}
                                </Text>
                            </Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    return (
        <>
            <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
                <StatusBar
                    barStyle={isDarkMode ? "light-content" : "dark-content"}
                    backgroundColor={palette.background}
                />

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
                            Historial
                        </Text>

                        <Text variant="bodyMedium" style={styles.subtitle}>
                            Consultá las tareas y objetivos semanales que ya fueron completados por el equipo.
                        </Text>
                    </View>

                    <Card style={styles.filtersCard}>
                        <Card.Content style={styles.filtersContent}>
                            <View style={styles.filtersTopRow}>
                                <View style={styles.filtersTitleRow}>
                                    <View style={styles.filtersIconWrap}>
                                        <MaterialCommunityIcons
                                            name="filter-variant"
                                            size={15}
                                            color={palette.primary}
                                        />
                                    </View>

                                    <Text style={styles.filtersTitle}>Filtros</Text>
                                </View>

                                <Pressable
                                    onPress={handleClearFilters}
                                    disabled={!hasActiveFilters}
                                    hitSlop={8}
                                    style={styles.clearFiltersPressable}
                                >
                                    <Text
                                        style={[
                                            styles.clearFiltersText,
                                            !hasActiveFilters &&
                                                styles.clearFiltersTextHidden,
                                        ]}
                                    >
                                        Limpiar
                                    </Text>
                                </Pressable>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.filtersScrollContent}
                            >
                                <Chip
                                    compact
                                    selected={ownerFilter === "mine"}
                                    onPress={() => handleToggleOwnerFilter("mine")}
                                    showSelectedCheck={false}
                                    style={[
                                        styles.filterChip,
                                        ownerFilter === "mine" &&
                                            styles.filterChipSelected,
                                    ]}
                                    textStyle={[
                                        styles.filterChipText,
                                        ownerFilter === "mine" &&
                                            styles.filterChipTextSelected,
                                    ]}
                                    icon={() => (
                                        <MaterialCommunityIcons
                                            name="account-check-outline"
                                            size={14}
                                            color={
                                                ownerFilter === "mine"
                                                    ? palette.primary
                                                    : palette.textMuted
                                            }
                                        />
                                    )}
                                >
                                    Mías
                                </Chip>

                                <Chip
                                    compact
                                    selected={ownerFilter === "others"}
                                    onPress={() => handleToggleOwnerFilter("others")}
                                    showSelectedCheck={false}
                                    style={[
                                        styles.filterChip,
                                        ownerFilter === "others" &&
                                            styles.filterChipSelected,
                                    ]}
                                    textStyle={[
                                        styles.filterChipText,
                                        ownerFilter === "others" &&
                                            styles.filterChipTextSelected,
                                    ]}
                                    icon={() => (
                                        <MaterialCommunityIcons
                                            name="account-group-outline"
                                            size={14}
                                            color={
                                                ownerFilter === "others"
                                                    ? palette.primary
                                                    : palette.textMuted
                                            }
                                        />
                                    )}
                                >
                                    Otros
                                </Chip>

                                <Chip
                                    compact
                                    selected={!!categoryFilter}
                                    onPress={() => setCategoryDialogVisible(true)}
                                    showSelectedCheck={false}
                                    style={[
                                        styles.filterChip,
                                        categoryFilter && {
                                            backgroundColor: selectedCategory?.soft,
                                            borderColor: selectedCategory?.border,
                                        },
                                    ]}
                                    textStyle={[
                                        styles.filterChipText,
                                        categoryFilter && {
                                            color: selectedCategory?.color,
                                            fontWeight: "800",
                                        },
                                    ]}
                                    icon={() => (
                                        <MaterialCommunityIcons
                                            name={selectedCategory?.icon || "shape-outline"}
                                            size={14}
                                            color={
                                                categoryFilter
                                                    ? selectedCategory?.color
                                                    : palette.textMuted
                                            }
                                        />
                                    )}
                                >
                                    {selectedCategory?.label || "Categoría"}
                                </Chip>
                            </ScrollView>
                        </Card.Content>
                    </Card>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                            {selectedCategory
                                ? `Completados de ${selectedCategory.label}`
                                : "Completados"}
                        </Text>

                        <Text style={styles.sectionSubtitle}>
                            {loading
                                ? "Cargando historial..."
                                : `${historyItems.length} resultado${
                                      historyItems.length === 1 ? "" : "s"
                                  } encontrado${
                                      historyItems.length === 1 ? "" : "s"
                                  }`}
                        </Text>
                    </View>

                    {loading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color={palette.primary} />
                            <Text style={styles.loadingText}>
                                Cargando historial...
                            </Text>
                        </View>
                    ) : historyItems.length === 0 ? (
                        <Card style={styles.emptyCard}>
                            <Card.Content style={styles.emptyContent}>
                                <View style={styles.emptyIconCircle}>
                                    <MaterialCommunityIcons
                                        name="clipboard-text-clock-outline"
                                        size={34}
                                        color={palette.primary}
                                    />
                                </View>

                                <Text variant="titleLarge" style={styles.emptyTitle}>
                                    No hay elementos completados
                                </Text>

                                <Text variant="bodyMedium" style={styles.emptyText}>
                                    Cuando una tarea u objetivo semanal se marque como completado, va a aparecer en este historial.
                                </Text>
                            </Card.Content>
                        </Card>
                    ) : (
                        <View style={styles.tasksList}>
                            {historyItems.map((item) =>
                                item.type === "objective"
                                    ? renderObjectiveCard(item.data)
                                    : renderTaskCard(item.data)
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>

            <Portal>
                <Dialog
                    visible={categoryDialogVisible}
                    onDismiss={() => setCategoryDialogVisible(false)}
                    style={styles.categoryDialog}
                >
                    <Dialog.Title style={styles.categoryDialogTitle}>
                        Filtrar por categoría
                    </Dialog.Title>

                    <Dialog.ScrollArea style={styles.categoryDialogScrollArea}>
                        <ScrollView
                            style={styles.categoryDialogScroll}
                            contentContainerStyle={styles.categoryDialogContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {NOTE_CATEGORIES.map((item) => {
                            const category = getNoteCategoryByKey(item.key, isDarkMode);
                            const selected = category.key === categoryFilter;

                            return (
                                <Pressable
                                    key={category.key}
                                    onPress={() => handleSelectCategoryFilter(category.key)}
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
                        {categoryFilter ? (
                            <Button
                                onPress={() => {
                                    setCategoryFilter(null);
                                    setCategoryDialogVisible(false);
                                }}
                                textColor={palette.textSecondary}
                            >
                                Quitar filtro
                            </Button>
                        ) : null}

                        <Button
                            onPress={() => setCategoryDialogVisible(false)}
                            textColor={palette.primary}
                        >
                            Cerrar
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </>
    );
}

function createStyles(palette, isDarkMode) {
    return StyleSheet.create({
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
                ? "rgba(240, 138, 43, 0.12)"
                : "rgba(209, 107, 24, 0.10)",
        },

        backgroundShapeBottom: {
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: isDarkMode
                ? "rgba(209, 107, 24, 0.10)"
                : "rgba(240, 138, 43, 0.08)",
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

        filtersCard: {
            borderRadius: 20,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            elevation: 1,
            marginBottom: 18,
            shadowColor: palette.shadow,
            shadowOpacity: isDarkMode ? 0.18 : 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
        },

        filtersContent: {
            paddingHorizontal: 12,
            paddingTop: 11,
            paddingBottom: 11,
        },

        filtersTopRow: {
            height: 28,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 9,
            overflow: "hidden",
        },

        filtersTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            flex: 1,
        },

        filtersIconWrap: {
            width: 27,
            height: 27,
            borderRadius: 10,
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.14)"
                : "rgba(209, 107, 24, 0.11)",
            borderWidth: 1,
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.25)"
                : "rgba(209, 107, 24, 0.22)",
            alignItems: "center",
            justifyContent: "center",
        },

        filtersTitle: {
            fontSize: 13.5,
            fontWeight: "800",
            color: palette.text,
        },

        clearFiltersPressable: {
            width: 64,
            height: 28,
            alignItems: "flex-end",
            justifyContent: "center",
            overflow: "hidden",
        },

        clearFiltersText: {
            fontSize: 12,
            fontWeight: "800",
            color: palette.textSecondary,
        },

        clearFiltersTextHidden: {
            opacity: 0,
        },

        filtersScrollContent: {
            gap: 8,
            paddingRight: 4,
        },

        filterChip: {
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.025)" : "#FFFFFF",
            borderWidth: 1,
            borderColor: palette.border,
        },

        filterChipSelected: {
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.14)"
                : "rgba(209, 107, 24, 0.11)",
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.28)"
                : "rgba(209, 107, 24, 0.25)",
        },

        filterChipText: {
            fontSize: 12,
            color: palette.textMuted,
            fontWeight: "700",
        },

        filterChipTextSelected: {
            color: palette.primary,
            fontWeight: "800",
        },

        sectionHeader: {
            marginBottom: 12,
        },

        sectionTitle: {
            fontSize: 17,
            fontWeight: "800",
            color: palette.text,
            marginBottom: 3,
        },

        sectionSubtitle: {
            fontSize: 13,
            color: palette.textSecondary,
        },

        centered: {
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 50,
        },

        loadingText: {
            marginTop: 10,
            color: palette.textSecondary,
            fontWeight: "600",
        },

        emptyCard: {
            borderRadius: 24,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            elevation: 2,
            shadowColor: palette.shadow,
            shadowOpacity: isDarkMode ? 0.18 : 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
        },

        emptyContent: {
            paddingHorizontal: 20,
            paddingVertical: 30,
            alignItems: "center",
        },

        emptyIconCircle: {
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.14)"
                : "rgba(209, 107, 24, 0.11)",
            borderWidth: 1,
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.25)"
                : "rgba(209, 107, 24, 0.22)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
        },

        emptyTitle: {
            fontWeight: "800",
            color: palette.text,
            textAlign: "center",
            marginBottom: 8,
        },

        emptyText: {
            color: palette.textSecondary,
            textAlign: "center",
            lineHeight: 21,
        },

        tasksList: {
            gap: 12,
        },

        taskCard: {
            borderRadius: 22,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            elevation: 2,
            shadowColor: palette.shadow,
            shadowOpacity: isDarkMode ? 0.18 : 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
        },

        taskContent: {
            paddingHorizontal: 16,
            paddingVertical: 16,
        },

        taskTop: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 12,
        },

        taskAvatar: {
            width: 46,
            height: 46,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
        },

        taskAvatarText: {
            fontSize: 18,
            fontWeight: "900",
        },

        taskTitleWrap: {
            flex: 1,
        },

        itemTypeRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            marginBottom: 3,
        },

        itemTypeText: {
            fontSize: 11.5,
            color: palette.textMuted,
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: 0.3,
        },

        taskTitle: {
            fontWeight: "800",
            color: palette.text,
            lineHeight: 23,
            marginBottom: 4,
        },

        taskDateText: {
            fontSize: 12.5,
            color: palette.textSecondary,
            textTransform: "capitalize",
        },

        doneBadge: {
            width: 32,
            height: 32,
            borderRadius: 12,
            backgroundColor: palette.success,
            alignItems: "center",
            justifyContent: "center",
        },

        chipsRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 10,
        },

        categoryChip: {
            alignSelf: "flex-start",
            borderWidth: 1,
        },

        categoryChipText: {
            fontWeight: "800",
            fontSize: 12,
        },

        completedChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            borderWidth: 1,
            borderRadius: 999,
            paddingHorizontal: 9,
            paddingVertical: 5,
            backgroundColor: palette.successSoft,
            borderColor: isDarkMode
                ? "rgba(125,216,125,0.24)"
                : "rgba(46,125,50,0.18)",
        },

        completedChipText: {
            fontSize: 11.5,
            fontWeight: "800",
            color: palette.successText,
        },

        objectiveChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            borderWidth: 1,
            borderRadius: 999,
            paddingHorizontal: 9,
            paddingVertical: 5,
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.12)"
                : "rgba(209, 107, 24, 0.09)",
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.24)"
                : "rgba(209, 107, 24, 0.18)",
        },

        objectiveChipText: {
            fontSize: 11.5,
            fontWeight: "800",
            color: palette.primary,
        },

        taskDescription: {
            color: palette.textSecondary,
            lineHeight: 19,
            marginBottom: 10,
        },

        metaStack: {
            gap: 7,
        },

        metaRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },

        metaText: {
            flex: 1,
            fontSize: 13,
            color: palette.textSecondary,
        },

        metaStrong: {
            fontWeight: "800",
            color: palette.text,
        },

        categoryDialog: {
            borderRadius: 24,
            backgroundColor: palette.card,
        },

        categoryDialogTitle: {
            color: palette.text,
            fontWeight: "800",
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
    });
}