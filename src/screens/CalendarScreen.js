//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Dialog,
    IconButton,
    Portal,
    Text,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getNoteCategoryByKey, NOTE_CATEGORIES } from "../constants/noteCategories";
import { useAuth } from "../context/AuthContext";
import {
    cancelTaskNotification,
    syncTaskNotificationsForUser,
} from "../services/notificationService";
import {
    deleteTask,
    getAllTasks,
    toggleTaskCompleted,
    updateTask,
} from "../services/taskService";

//JS:
const CALENDAR_VIEW_STORAGE_KEY = "calendar_view_mode";
const CALENDAR_VIEW_MODES = {
    MONTH: "month",
    WEEK: "week",
};

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MONTH_NAMES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
];

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

function toDateKey(date) {
    if (!date) return "";

    const d = new Date(date);
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDateFromKey(dateString) {
    if (!dateString) return new Date();

    const [year, month, day] = String(dateString).split("-");
    return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDateLong(dateString) {
    if (!dateString) return "";

    const date = getDateFromKey(dateString);

    return new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
}

function formatDateShort(dateString) {
    if (!dateString) return "";

    const date = getDateFromKey(dateString);

    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function formatMonthLabel(date) {
    if (!date) return "";

    const month = MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();

    return `${month} ${year}`;
}

function formatWeekRangeLabel(weekDays) {
    if (!Array.isArray(weekDays) || weekDays.length === 0) return "";

    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];

    const firstLabel = new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
    }).format(first);

    const lastLabel = new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(last);

    return `${firstLabel} - ${lastLabel}`;
}

function getInitials(name) {
    const safeName = String(name || "").trim();

    if (!safeName) return "?";

    return safeName.charAt(0).toUpperCase();
}

function normalizeResponsibleName(item) {
    if (!item) return "";

    if (typeof item === "string") return item;

    return (
        item.name ||
        item.nombre ||
        item.displayName ||
        item.email ||
        item.assignedToName ||
        ""
    );
}

function getTaskResponsibleNames(task) {
    const possibleArrays = [
        task?.assignedUsers,
        task?.assignedToUsers,
        task?.assignedToList,
        task?.responsables,
        task?.assignedToNames,
    ];

    for (const possibleArray of possibleArrays) {
        if (Array.isArray(possibleArray) && possibleArray.length > 0) {
            const names = possibleArray
                .map((item) => normalizeResponsibleName(item))
                .filter(Boolean);

            if (names.length > 0) {
                return names;
            }
        }
    }

    if (task?.assignedToName) {
        return [task.assignedToName];
    }

    return ["?"];
}

function getTaskResponsibleIds(task) {
    const ids = [];

    if (task?.assignedTo) {
        ids.push(String(task.assignedTo));
    }

    const possibleArrays = [
        task?.assignedUsers,
        task?.assignedToUsers,
        task?.assignedToList,
        task?.responsables,
    ];

    possibleArrays.forEach((possibleArray) => {
        if (!Array.isArray(possibleArray)) return;

        possibleArray.forEach((item) => {
            if (typeof item === "string") {
                ids.push(String(item));
                return;
            }

            if (item?.uid) ids.push(String(item.uid));
            if (item?.id) ids.push(String(item.id));
            if (item?.userId) ids.push(String(item.userId));
        });
    });

    return [...new Set(ids)];
}

function isTaskAssignedToUser(task, userId) {
    if (!userId) return false;

    const responsibleIds = getTaskResponsibleIds(task);
    return responsibleIds.some((id) => String(id) === String(userId));
}

function isDateBeforeToday(dateKey, todayKey) {
    if (!dateKey || !todayKey) return false;
    return String(dateKey) < String(todayKey);
}

function getTaskStatusMeta(task) {
    const isCompleted = !!task?.completed;

    if (isCompleted) {
        return {
            label: "Completada",
            color: "#2E7D32",
            soft: "rgba(46,125,50,0.10)",
            icon: "check-circle-outline",
        };
    }

    return {
        label: "Pendiente",
        color: "#B7791F",
        soft: "rgba(183,121,31,0.12)",
        icon: "clock-outline",
    };
}

function sortTasksForCalendar(a, b) {
    const aCompleted = !!a.completed;
    const bCompleted = !!b.completed;

    if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
    }

    const aPinned = !!a.isPinned;
    const bPinned = !!b.isPinned;

    if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
    }

    const orderA = typeof a?.order === "number" ? a.order : 999999;
    const orderB = typeof b?.order === "number" ? b.order : 999999;

    if (orderA !== orderB) {
        return orderA - orderB;
    }

    const aTime = a?.createdAt?.seconds || 0;
    const bTime = b?.createdAt?.seconds || 0;

    return aTime - bTime;
}

function getMonthMatrix(date) {
    const baseDate = new Date(date);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayWeekIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - firstDayWeekIndex);

    const days = [];

    for (let index = 0; index < 42; index += 1) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + index);
        days.push(day);
    }

    const weeks = [];

    for (let index = 0; index < days.length; index += 7) {
        weeks.push(days.slice(index, index + 7));
    }

    return weeks;
}

function getWeekStart(date) {
    const safeDate = new Date(date);
    safeDate.setHours(0, 0, 0, 0);

    const day = safeDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    safeDate.setDate(safeDate.getDate() + diff);
    return safeDate;
}

function getWeekDays(date) {
    const start = getWeekStart(date);

    return Array.from({ length: 7 }).map((_, index) => {
        const day = new Date(start);
        day.setDate(start.getDate() + index);
        return day;
    });
}

function CalendarTaskPreview({ task, variant = "month", isPastDay = false }) {
    const category = getNoteCategoryByKey(task.categoryKey);
    const names = getTaskResponsibleNames(task);
    const visibleNames = names.slice(0, variant === "week" ? 4 : 3);
    const extraNames = Math.max(names.length - visibleNames.length, 0);

    return (
        <View
            style={[
                variant === "week" ? styles.weekTaskCard : styles.monthTaskCard,
                {
                    backgroundColor: isPastDay ? "rgba(148,163,184,0.18)" : category.soft,
                    borderColor: isPastDay ? "rgba(100,116,139,0.32)" : category.border,
                },
            ]}
        >
            <View style={styles.taskPreviewInitialsRow}>
                {visibleNames.map((name, index) => (
                    <View
                        key={`${name}-${index}`}
                        style={[
                            variant === "week"
                                ? styles.weekTaskInitial
                                : styles.monthTaskInitial,
                            {
                                backgroundColor: isPastDay ? "#64748B" : category.color,
                            },
                        ]}
                    >
                        <Text
                            style={
                                variant === "week"
                                    ? styles.weekTaskInitialText
                                    : styles.monthTaskInitialText
                            }
                        >
                            {getInitials(name)}
                        </Text>
                    </View>
                ))}

                {extraNames > 0 ? (
                    <View
                        style={[
                            variant === "week"
                                ? styles.weekTaskInitial
                                : styles.monthTaskInitial,
                            {
                                backgroundColor: "#475467",
                            },
                        ]}
                    >
                        <Text
                            style={
                                variant === "week"
                                    ? styles.weekTaskInitialText
                                    : styles.monthTaskInitialText
                            }
                        >
                            +{extraNames}
                        </Text>
                    </View>
                ) : null}
            </View>

            <Text
                style={[
                    variant === "week" ? styles.weekTaskTitle : styles.monthTaskTitle,
                    {
                        color: isPastDay ? "#475467" : category.color,
                    },
                ]}
                numberOfLines={variant === "week" ? 2 : 1}
                ellipsizeMode="tail"
            >
                {task.title || "Tarea"}
            </Text>
        </View>
    );
}

function MonthDayCell({
    date,
    currentMonthDate,
    selectedDate,
    todayKey,
    tasksByDate,
    onPressDay,
    dayCellWidth,
    dayCellHeight,
}) {
    const dateKey = toDateKey(date);
    const dayTasks = tasksByDate[dateKey] || [];
    const visibleTasks = dayTasks.slice(0, 3);
    const hiddenCount = Math.max(dayTasks.length - 3, 0);

    const isSelected = selectedDate === dateKey;
    const isToday = todayKey === dateKey;
    const isPastDay = isDateBeforeToday(dateKey, todayKey);
    const isCurrentMonth = date.getMonth() === currentMonthDate.getMonth();
    const hasPinnedTask = dayTasks.some((task) => !!task?.isPinned);

    return (
        <Pressable
            onPress={() => onPressDay(dateKey)}
            style={({ pressed }) => [
                styles.monthDayCell,
                {
                    width: dayCellWidth,
                    height: dayCellHeight,
                },
                isPastDay && styles.monthDayCellPast,
                isSelected && styles.monthDayCellSelected,
                isToday && styles.monthDayCellToday,
                pressed && styles.monthDayCellPressed,
            ]}
        >
            {hasPinnedTask ? (
                <View style={styles.dayPinnedBadge}>
                    <MaterialCommunityIcons name="star" size={9} color="#FFFFFF" />
                </View>
            ) : null}

            <Text
                style={[
                    styles.monthDayNumber,
                    !isCurrentMonth && styles.monthDayNumberDisabled,
                    isPastDay && styles.monthDayNumberPast,
                    isToday && styles.monthDayNumberToday,
                ]}
            >
                {date.getDate()}
            </Text>

            <View style={styles.monthTasksWrap}>
                {visibleTasks.map((task) => (
                    <CalendarTaskPreview
                        key={task.id}
                        task={task}
                        variant="month"
                        isPastDay={isPastDay}
                    />
                ))}

                {hiddenCount > 0 ? (
                    <View
                        style={[
                            styles.monthMoreBadge,
                            isPastDay && styles.monthMoreBadgePast,
                        ]}
                    >
                        <Text
                            style={[
                                styles.monthMoreText,
                                isPastDay && styles.monthMoreTextPast,
                            ]}
                        >
                            +{hiddenCount}
                        </Text>
                    </View>
                ) : null}
            </View>
        </Pressable>
    );
}

function WeekDayColumn({
    date,
    selectedDate,
    todayKey,
    tasksByDate,
    onPressDay,
    dayColumnWidth,
}) {
    const dateKey = toDateKey(date);
    const dayTasks = tasksByDate[dateKey] || [];
    const isSelected = selectedDate === dateKey;
    const isToday = todayKey === dateKey;
    const isPastDay = isDateBeforeToday(dateKey, todayKey);
    const hasPinnedTask = dayTasks.some((task) => !!task?.isPinned);

    return (
        <Pressable
            onPress={() => onPressDay(dateKey)}
            style={({ pressed }) => [
                styles.weekDayColumn,
                {
                    width: dayColumnWidth,
                },
                isPastDay && styles.weekDayColumnPast,
                isSelected && styles.weekDayColumnSelected,
                isToday && styles.weekDayColumnToday,
                pressed && styles.weekDayColumnPressed,
            ]}
        >
            {hasPinnedTask ? (
                <View style={styles.weekPinnedBadge}>
                    <MaterialCommunityIcons name="star" size={9} color="#FFFFFF" />
                </View>
            ) : null}

            <Text
                style={[
                    styles.weekDayNumber,
                    isPastDay && styles.weekDayNumberPast,
                    isToday && styles.weekDayNumberToday,
                ]}
            >
                {date.getDate()}
            </Text>

            <View style={styles.weekTasksWrap}>
                {dayTasks.length > 0 ? (
                    dayTasks.map((task) => (
                        <CalendarTaskPreview
                            key={task.id}
                            task={task}
                            variant="week"
                            isPastDay={isPastDay}
                        />
                    ))
                ) : (
                    <View style={styles.weekEmptySpace} />
                )}
            </View>
        </Pressable>
    );
}

export default function CalendarScreen({ navigation }) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { user } = useAuth();

    const todayKey = useMemo(() => toDateKey(new Date()), []);

    const [calendarViewMode, setCalendarViewMode] = useState(CALENDAR_VIEW_MODES.MONTH);
    const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
    const [currentWeekDate, setCurrentWeekDate] = useState(() => new Date());

    const dayCellWidth = useMemo(() => {
        const availableWidth = width - 12;
        return Math.floor(availableWidth / 7);
    }, [width]);

    const dayCellHeight = useMemo(() => {
        return 132;
    }, []);

    const weekColumnWidth = useMemo(() => {
        const availableWidth = width - 12;
        return Math.floor(availableWidth / 7);
    }, [width]);

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
    const [dialogVisible, setDialogVisible] = useState(false);

    const [updatingTaskId, setUpdatingTaskId] = useState(null);
    const [pinningTaskId, setPinningTaskId] = useState(null);
    const [deletingTaskId, setDeletingTaskId] = useState(null);
    const [reordering, setReordering] = useState(false);

    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    const [ownerFilter, setOwnerFilter] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);

    useEffect(() => {
        async function loadSavedCalendarViewMode() {
            try {
                const savedMode = await AsyncStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);

                if (
                    savedMode === CALENDAR_VIEW_MODES.MONTH ||
                    savedMode === CALENDAR_VIEW_MODES.WEEK
                ) {
                    setCalendarViewMode(savedMode);
                }
            } catch (error) {
                console.log("LOAD CALENDAR VIEW MODE ERROR:", error);
            }
        }

        loadSavedCalendarViewMode();
    }, []);

    const saveCalendarViewMode = async (mode) => {
        try {
            await AsyncStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, mode);
        } catch (error) {
            console.log("SAVE CALENDAR VIEW MODE ERROR:", error);
        }
    };

    const handleChangeCalendarViewMode = (mode) => {
        setCalendarViewMode(mode);
        saveCalendarViewMode(mode);
    };

    const loadTasks = useCallback(async () => {
        try {
            setLoading(true);

            const data = await getAllTasks();
            const safeTasks = Array.isArray(data) ? data.filter(Boolean) : [];

            setTasks(safeTasks);

            await syncTaskNotificationsForUser({
                tasks: safeTasks,
                userId: user?.uid,
            });
        } catch (error) {
            console.log("LOAD TASKS CALENDAR ERROR:", error);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useFocusEffect(
        useCallback(() => {
            if (user?.uid) {
                loadTasks();
            }
        }, [user?.uid, loadTasks])
    );

    const datedTasks = useMemo(() => {
        return (tasks || [])
            .map((task) => {
                const dueDate = getDueDateFromTask(task);
                if (!dueDate) return null;

                return {
                    ...task,
                    parsedDueDate: dueDate,
                    dateKey: toDateKey(dueDate),
                };
            })
            .filter(Boolean)
            .filter((task) => !task.completed)
            .sort(sortTasksForCalendar);
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return datedTasks.filter((task) => {
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
    }, [datedTasks, ownerFilter, categoryFilter, user?.uid]);

    const tasksByDate = useMemo(() => {
        return filteredTasks.reduce((acc, task) => {
            if (!acc[task.dateKey]) {
                acc[task.dateKey] = [];
            }

            acc[task.dateKey].push(task);
            acc[task.dateKey].sort(sortTasksForCalendar);
            return acc;
        }, {});
    }, [filteredTasks]);

    const selectedTasks = useMemo(() => {
        return tasksByDate[selectedDate] || [];
    }, [tasksByDate, selectedDate]);

    const selectedCategory = useMemo(() => {
        if (!categoryFilter) return null;

        return getNoteCategoryByKey(categoryFilter);
    }, [categoryFilter]);

    const monthWeeks = useMemo(() => {
        return getMonthMatrix(currentMonthDate);
    }, [currentMonthDate]);

    const weekDays = useMemo(() => {
        return getWeekDays(currentWeekDate);
    }, [currentWeekDate]);

    const hasActiveFilters = !!ownerFilter || !!categoryFilter;
    const canReorderSelectedDay = selectedTasks.length > 1;

    const handleDayPress = (dateKey) => {
        if (!dateKey) return;

        setSelectedDate(dateKey);
        setDialogVisible(true);
    };

    const handleCreateTaskForSelectedDate = () => {
        setDialogVisible(false);
        navigation.navigate("Crear tarea", { selectedDate });
    };

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

    const handlePreviousMonth = () => {
        setCurrentMonthDate((prev) => {
            const next = new Date(prev);
            next.setMonth(prev.getMonth() - 1);
            return next;
        });
    };

    const handleNextMonth = () => {
        setCurrentMonthDate((prev) => {
            const next = new Date(prev);
            next.setMonth(prev.getMonth() + 1);
            return next;
        });
    };

    const handlePreviousWeek = () => {
        setCurrentWeekDate((prev) => {
            const next = new Date(prev);
            next.setDate(prev.getDate() - 7);
            return next;
        });
    };

    const handleNextWeek = () => {
        setCurrentWeekDate((prev) => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + 7);
            return next;
        });
    };

    const handleToggleTask = async (task) => {
        if (!task?.id) return;

        try {
            setUpdatingTaskId(task.id);

            const nextCompletedValue = !task.completed;

            await toggleTaskCompleted(task.id, nextCompletedValue);

            if (nextCompletedValue) {
                await cancelTaskNotification(task.id);
            }

            await loadTasks();
        } catch (error) {
            console.log("TOGGLE TASK CALENDAR ERROR:", error);
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const handleTogglePinned = async (task) => {
        if (!task?.id) return;

        try {
            setPinningTaskId(task.id);
            await updateTask(task.id, {
                isPinned: !task.isPinned,
            });
            await loadTasks();
        } catch (error) {
            console.log("TOGGLE PINNED TASK ERROR:", error);
        } finally {
            setPinningTaskId(null);
        }
    };

    const handleAskDeleteTask = (task) => {
        if (!task?.id) return;

        setTaskToDelete(task);
        setDeleteDialogVisible(true);
    };

    const handleEditTask = (task) => {
        if (!task?.id) return;

        setDialogVisible(false);

        navigation.navigate("Editar tarea", {
            task,
        });
    };

    const handleCloseDeleteDialog = () => {
        if (deletingTaskId) return;

        setDeleteDialogVisible(false);
        setTaskToDelete(null);
    };

    const handleConfirmDeleteTask = async () => {
        if (!taskToDelete?.id) return;

        try {
            setDeletingTaskId(taskToDelete.id);

            await deleteTask(taskToDelete.id);
            await cancelTaskNotification(taskToDelete.id);

            setTasks((prevTasks) =>
                prevTasks.filter((task) => String(task.id) !== String(taskToDelete.id))
            );

            setDeleteDialogVisible(false);
            setTaskToDelete(null);

            await loadTasks();
        } catch (error) {
            console.log("DELETE TASK ERROR:", error);
        } finally {
            setDeletingTaskId(null);
        }
    };

    const handleDragEnd = async ({ data }) => {
        try {
            setReordering(true);

            setTasks((prevTasks) => {
                const orderMap = new Map();

                data.forEach((task, index) => {
                    orderMap.set(task.id, index);
                });

                return prevTasks.map((task) => {
                    if (!orderMap.has(task.id)) return task;

                    return {
                        ...task,
                        order: orderMap.get(task.id),
                    };
                });
            });

            await Promise.all(
                data.map((task, index) =>
                    updateTask(task.id, {
                        order: index,
                    })
                )
            );

            await loadTasks();
        } catch (error) {
            console.log("REORDER TASKS ERROR:", error);
        } finally {
            setReordering(false);
        }
    };

    const renderTaskItem = ({ item: task, drag, isActive }) => {
        const category = getNoteCategoryByKey(task.categoryKey);
        const statusMeta = getTaskStatusMeta(task);
        const responsibleNames = getTaskResponsibleNames(task);

        const isUpdating = updatingTaskId === task.id;
        const isPinning = pinningTaskId === task.id;
        const isDeleting = deletingTaskId === task.id;

        return (
            <ScaleDecorator>
                <Pressable
                    onLongPress={canReorderSelectedDay ? drag : undefined}
                    delayLongPress={180}
                    disabled={isActive}
                    style={[
                        styles.taskItem,
                        isActive && styles.taskItemDragging,
                        task.isPinned && styles.taskItemPinned,
                    ]}
                >
                    <View style={styles.taskTop}>
                        <View style={styles.taskAvatarGroup}>
                            {responsibleNames.slice(0, 3).map((name, index) => (
                                <View
                                    key={`${name}-${index}`}
                                    style={[
                                        styles.taskAvatar,
                                        {
                                            backgroundColor: category.color,
                                            marginLeft: index === 0 ? 0 : -8,
                                        },
                                    ]}
                                >
                                    <Text style={styles.taskAvatarText}>
                                        {getInitials(name)}
                                    </Text>
                                </View>
                            ))}

                            {responsibleNames.length > 3 ? (
                                <View
                                    style={[
                                        styles.taskAvatar,
                                        {
                                            backgroundColor: "#667085",
                                            marginLeft: -8,
                                        },
                                    ]}
                                >
                                    <Text style={styles.taskAvatarText}>
                                        +{responsibleNames.length - 3}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.taskTitleWrap}>
                            <Text style={styles.taskTitle} numberOfLines={2}>
                                {task.title || "Sin título"}
                            </Text>

                            <Text style={styles.taskAssignedText} numberOfLines={1}>
                                {responsibleNames.join(", ") || "Sin asignar"}
                            </Text>
                        </View>

                        <View style={styles.taskPriorityActions}>
                            <IconButton
                                icon={task.isPinned ? "star" : "star-outline"}
                                size={18}
                                mode="contained-tonal"
                                loading={isPinning}
                                disabled={isPinning || isDeleting}
                                iconColor={task.isPinned ? "#B7791F" : "#98A2B3"}
                                containerColor={
                                    task.isPinned ? "rgba(245,158,11,0.16)" : "#F8FAFC"
                                }
                                style={styles.priorityActionButton}
                                onPress={() => handleTogglePinned(task)}
                            />

                            {canReorderSelectedDay ? (
                                <Pressable onLongPress={drag} delayLongPress={100} hitSlop={8}>
                                    <View style={styles.dragHandle}>
                                        <MaterialCommunityIcons
                                            name="drag"
                                            size={19}
                                            color="#98A2B3"
                                        />
                                    </View>
                                </Pressable>
                            ) : null}
                        </View>
                    </View>

                    <View style={styles.topTaskChipsRow}>
                        {task.isPinned ? (
                            <View style={styles.principalChip}>
                                <Text style={styles.principalChipText}>Tarea principal</Text>
                            </View>
                        ) : null}

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

                        <View
                            style={[
                                styles.smallChip,
                                {
                                    backgroundColor: statusMeta.soft,
                                    borderColor: statusMeta.soft,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name={statusMeta.icon}
                                size={13}
                                color={statusMeta.color}
                            />
                            <Text
                                style={[
                                    styles.smallChipText,
                                    { color: statusMeta.color },
                                ]}
                            >
                                {statusMeta.label}
                            </Text>
                        </View>
                    </View>

                    {!!task.description ? (
                        <Text style={styles.taskDescription}>
                            {task.description}
                        </Text>
                    ) : null}

                    <View style={styles.metaStack}>
                        <View style={styles.modalMetaRow}>
                            <MaterialCommunityIcons
                                name="account-edit-outline"
                                size={15}
                                color="#667085"
                            />
                            <Text style={styles.modalMetaText}>
                                Creada por{" "}
                                <Text style={styles.modalMetaStrong}>
                                    {task.createdByName || "Usuario"}
                                </Text>
                            </Text>
                        </View>

                        <View style={styles.modalMetaRow}>
                            <MaterialCommunityIcons
                                name="calendar-month-outline"
                                size={15}
                                color="#667085"
                            />
                            <Text style={styles.modalMetaText}>
                                Fecha{" "}
                                <Text style={styles.modalMetaStrong}>
                                    {formatDateShort(task.dateKey)}
                                </Text>
                            </Text>
                        </View>
                    </View>

                    <View style={styles.secondaryActionsBar}>
                        <Pressable
                            onPress={() => handleEditTask(task)}
                            disabled={isDeleting || isPinning}
                            style={({ pressed }) => [
                                styles.secondaryActionButton,
                                pressed && styles.secondaryActionButtonPressed,
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="pencil-outline"
                                size={16}
                                color="#2563EB"
                            />
                            <Text style={[styles.secondaryActionText, { color: "#2563EB" }]}>
                                Editar
                            </Text>
                        </Pressable>

                        <View style={styles.secondaryActionsDivider} />

                        <Pressable
                            onPress={() => handleAskDeleteTask(task)}
                            disabled={isDeleting || isPinning}
                            style={({ pressed }) => [
                                styles.secondaryActionButton,
                                pressed && styles.secondaryActionButtonPressed,
                            ]}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size={14} color="#B42318" />
                            ) : (
                                <MaterialCommunityIcons
                                    name="trash-can-outline"
                                    size={16}
                                    color="#B42318"
                                />
                            )}
                            <Text style={[styles.secondaryActionText, { color: "#B42318" }]}>
                                Eliminar
                            </Text>
                        </Pressable>
                    </View>

                    <Button
                        mode="contained"
                        onPress={() => handleToggleTask(task)}
                        loading={isUpdating}
                        disabled={isUpdating || isDeleting}
                        style={styles.toggleTaskButton}
                        contentStyle={styles.toggleTaskButtonContent}
                        buttonColor={theme.colors.primary}
                        textColor="#FFFFFF"
                        icon="check"
                    >
                        Marcar completada
                    </Button>
                </Pressable>
            </ScaleDecorator>
        );
    };

    return (
        <>
            <View
                style={[
                    styles.container,
                    {
                        backgroundColor: "#F4F8F1",
                        paddingTop: insets.top + 6,
                    },
                ]}
            >
                <StatusBar barStyle="dark-content" backgroundColor="#F4F8F1" />

                <View style={styles.backgroundOrbTop} />
                <View style={styles.backgroundOrbBottom} />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: 118 + insets.bottom },
                    ]}
                >
                    <View style={styles.header}>
                        <Text variant="headlineMedium" style={styles.title}>
                            Tareas
                        </Text>

                        <Text variant="bodyMedium" style={styles.subtitle}>
                            Visualizá las tareas pendientes por día, responsable y categoría.
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
                                            color={theme.colors.primary}
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
                                            !hasActiveFilters && styles.clearFiltersTextHidden,
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
                                        ownerFilter === "mine" && styles.filterChipSelected,
                                    ]}
                                    textStyle={[
                                        styles.filterChipText,
                                        ownerFilter === "mine" && {
                                            color: theme.colors.primary,
                                            fontWeight: "800",
                                        },
                                    ]}
                                    icon={() => (
                                        <MaterialCommunityIcons
                                            name="account-check-outline"
                                            size={14}
                                            color={ownerFilter === "mine" ? theme.colors.primary : "#667085"}
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
                                        ownerFilter === "others" && styles.filterChipSelected,
                                    ]}
                                    textStyle={[
                                        styles.filterChipText,
                                        ownerFilter === "others" && {
                                            color: theme.colors.primary,
                                            fontWeight: "800",
                                        },
                                    ]}
                                    icon={() => (
                                        <MaterialCommunityIcons
                                            name="account-group-outline"
                                            size={14}
                                            color={
                                                ownerFilter === "others" ? theme.colors.primary : "#667085"
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
                                            color={categoryFilter ? selectedCategory?.color : "#667085"}
                                        />
                                    )}
                                >
                                    {selectedCategory?.label || "Categoría"}
                                </Chip>
                            </ScrollView>
                        </Card.Content>
                    </Card>

                    <Card style={styles.calendarCard}>
                        <Card.Content style={styles.calendarContent}>
                            <View style={styles.calendarHeader}>
                                <IconButton
                                    icon="chevron-left"
                                    size={22}
                                    iconColor={theme.colors.primary}
                                    onPress={
                                        calendarViewMode === CALENDAR_VIEW_MODES.MONTH
                                            ? handlePreviousMonth
                                            : handlePreviousWeek
                                    }
                                    style={styles.calendarArrowButton}
                                />

                                <View style={styles.calendarTitleWrap}>
                                    <Text style={styles.calendarTitle}>
                                        {calendarViewMode === CALENDAR_VIEW_MODES.MONTH
                                            ? formatMonthLabel(currentMonthDate)
                                            : formatWeekRangeLabel(weekDays)}
                                    </Text>

                                    <Text style={styles.calendarSubtitle}>
                                        {calendarViewMode === CALENDAR_VIEW_MODES.MONTH
                                            ? "Vista mensual"
                                            : "Vista semanal"}
                                    </Text>
                                </View>

                                <IconButton
                                    icon="chevron-right"
                                    size={22}
                                    iconColor={theme.colors.primary}
                                    onPress={
                                        calendarViewMode === CALENDAR_VIEW_MODES.MONTH
                                            ? handleNextMonth
                                            : handleNextWeek
                                    }
                                    style={styles.calendarArrowButton}
                                />
                            </View>

                            <View style={styles.viewModeSwitch}>
                                <Pressable
                                    onPress={() => handleChangeCalendarViewMode(CALENDAR_VIEW_MODES.MONTH)}
                                    style={[
                                        styles.viewModeOption,
                                        calendarViewMode === CALENDAR_VIEW_MODES.MONTH &&
                                            styles.viewModeOptionActive,
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name="calendar-month-outline"
                                        size={15}
                                        color={
                                            calendarViewMode === CALENDAR_VIEW_MODES.MONTH
                                                ? "#FFFFFF"
                                                : theme.colors.primary
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.viewModeText,
                                            calendarViewMode === CALENDAR_VIEW_MODES.MONTH &&
                                                styles.viewModeTextActive,
                                        ]}
                                    >
                                        Mensual
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleChangeCalendarViewMode(CALENDAR_VIEW_MODES.WEEK)}
                                    style={[
                                        styles.viewModeOption,
                                        calendarViewMode === CALENDAR_VIEW_MODES.WEEK &&
                                            styles.viewModeOptionActive,
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name="calendar-week-outline"
                                        size={15}
                                        color={
                                            calendarViewMode === CALENDAR_VIEW_MODES.WEEK
                                                ? "#FFFFFF"
                                                : theme.colors.primary
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.viewModeText,
                                            calendarViewMode === CALENDAR_VIEW_MODES.WEEK &&
                                                styles.viewModeTextActive,
                                        ]}
                                    >
                                        Semanal
                                    </Text>
                                </Pressable>
                            </View>

                            {loading ? (
                                <View style={styles.loadingBox}>
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                    <Text style={styles.loadingText}>Cargando tareas...</Text>
                                </View>
                            ) : calendarViewMode === CALENDAR_VIEW_MODES.MONTH ? (
                                <View style={styles.monthCalendar}>
                                    <View style={styles.weekHeaderRow}>
                                        {WEEK_DAYS.map((day) => (
                                            <View
                                                key={day}
                                                style={[
                                                    styles.weekHeaderCell,
                                                    { width: dayCellWidth },
                                                ]}
                                            >
                                                <Text style={styles.weekHeaderText}>{day}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {monthWeeks.map((week, weekIndex) => (
                                        <View key={`week-${weekIndex}`} style={styles.monthWeekRow}>
                                            {week.map((date) => (
                                                <MonthDayCell
                                                    key={toDateKey(date)}
                                                    date={date}
                                                    currentMonthDate={currentMonthDate}
                                                    selectedDate={selectedDate}
                                                    todayKey={todayKey}
                                                    tasksByDate={tasksByDate}
                                                    onPressDay={handleDayPress}
                                                    dayCellWidth={dayCellWidth}
                                                    dayCellHeight={dayCellHeight}
                                                />
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.weekCalendarScrollContent}
                                >
                                    <View style={styles.weekCalendar}>
                                        <View style={styles.weekHeaderRow}>
                                            {weekDays.map((date, index) => (
                                                <View
                                                    key={`week-header-${toDateKey(date)}`}
                                                    style={[
                                                        styles.weekHeaderCell,
                                                        { width: weekColumnWidth },
                                                    ]}
                                                >
                                                    <Text style={styles.weekHeaderText}>
                                                        {WEEK_DAYS[index]}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>

                                        <View style={styles.weekColumnsRow}>
                                            {weekDays.map((date) => (
                                                <WeekDayColumn
                                                    key={toDateKey(date)}
                                                    date={date}
                                                    selectedDate={selectedDate}
                                                    todayKey={todayKey}
                                                    tasksByDate={tasksByDate}
                                                    onPressDay={handleDayPress}
                                                    dayColumnWidth={weekColumnWidth}
                                                />
                                            ))}
                                        </View>
                                    </View>
                                </ScrollView>
                            )}
                        </Card.Content>
                    </Card>
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
                                const selected = item.key === categoryFilter;

                                return (
                                    <Pressable
                                        key={item.key}
                                        onPress={() => handleSelectCategoryFilter(item.key)}
                                        style={({ pressed }) => [
                                            styles.categoryOption,
                                            {
                                                backgroundColor: selected ? item.soft : "#FFFFFF",
                                                borderColor: selected ? item.border : "#ECEFF3",
                                            },
                                            pressed && styles.categoryOptionPressed,
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.categoryOptionIcon,
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
                                                styles.categoryOptionText,
                                                selected && { color: item.color },
                                            ]}
                                        >
                                            {item.label}
                                        </Text>

                                        {selected ? (
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

                    <Dialog.Actions>
                        {categoryFilter ? (
                            <Button
                                onPress={() => {
                                    setCategoryFilter(null);
                                    setCategoryDialogVisible(false);
                                }}
                                textColor="#667085"
                            >
                                Quitar filtro
                            </Button>
                        ) : null}

                        <Button onPress={() => setCategoryDialogVisible(false)}>
                            Cerrar
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                <Dialog
                    visible={dialogVisible}
                    onDismiss={() => setDialogVisible(false)}
                    style={styles.dialog}
                >
                    <Dialog.Title style={styles.dialogTitle}>
                        {formatDateLong(selectedDate)}
                    </Dialog.Title>

                    {selectedTasks.length > 1 ? (
                        <View style={styles.reorderHintBox}>
                            <MaterialCommunityIcons name="gesture-tap-hold" size={15} color="#667085" />
                            <Text style={styles.reorderHintText}>
                                Mantené presionada una tarea y arrastrala para ordenar la prioridad del día.
                            </Text>
                        </View>
                    ) : null}

                    <Dialog.ScrollArea style={styles.dialogScrollArea}>
                        {selectedTasks.length > 0 ? (
                            <DraggableFlatList
                                data={selectedTasks}
                                keyExtractor={(item) => String(item.id)}
                                renderItem={renderTaskItem}
                                onDragEnd={handleDragEnd}
                                activationDistance={8}
                                scrollEnabled
                                style={styles.dragList}
                                contentContainerStyle={styles.dialogScrollContent}
                                showsVerticalScrollIndicator={false}
                                ListFooterComponent={
                                    reordering ? (
                                        <View style={styles.reorderingBox}>
                                            <ActivityIndicator size="small" color={theme.colors.primary} />
                                            <Text style={styles.reorderingText}>Guardando orden...</Text>
                                        </View>
                                    ) : null
                                }
                            />
                        ) : (
                            <ScrollView
                                style={styles.dialogScroll}
                                contentContainerStyle={styles.dialogScrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={styles.emptyDialogBox}>
                                    <View style={styles.emptyDialogIconCircle}>
                                        <MaterialCommunityIcons
                                            name="calendar-plus"
                                            size={30}
                                            color={theme.colors.primary}
                                        />
                                    </View>

                                    <Text style={styles.emptyDialogTitle}>
                                        Sin tareas pendientes
                                    </Text>

                                    <Text style={styles.emptyDialogText}>
                                        No hay tareas pendientes para {formatDateShort(selectedDate)}.
                                    </Text>
                                </View>
                            </ScrollView>
                        )}
                    </Dialog.ScrollArea>

                    <Dialog.Actions style={styles.modalActionsRow}>
                        <Button
                            mode="text"
                            compact
                            onPress={() => setDialogVisible(false)}
                            textColor="#667085"
                            style={styles.modalSmallButton}
                            labelStyle={styles.modalSmallButtonLabel}
                        >
                            Cerrar
                        </Button>

                        <Button
                            mode="outlined"
                            compact
                            onPress={handleCreateTaskForSelectedDate}
                            textColor={theme.colors.primary}
                            style={styles.modalSmallButton}
                            labelStyle={styles.modalSmallButtonLabel}
                            icon="plus"
                        >
                            Nueva tarea
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                <Dialog
                    visible={deleteDialogVisible}
                    onDismiss={handleCloseDeleteDialog}
                    style={styles.deleteDialog}
                >
                    <Dialog.Content style={styles.deleteDialogContent}>
                        <View style={styles.deleteIconCircle}>
                            <MaterialCommunityIcons
                                name="trash-can-outline"
                                size={28}
                                color="#FFFFFF"
                            />
                        </View>

                        <Text variant="titleLarge" style={styles.deleteDialogTitle}>
                            Eliminar tarea
                        </Text>

                        <Text variant="bodyMedium" style={styles.deleteDialogText}>
                            ¿Querés eliminar{" "}
                            <Text style={styles.deleteDialogStrong}>
                                {taskToDelete?.title || "esta tarea"}
                            </Text>
                            ? Esta acción no se puede deshacer.
                        </Text>

                        <View style={styles.deleteDialogActions}>
                            <Button
                                mode="outlined"
                                onPress={handleCloseDeleteDialog}
                                disabled={!!deletingTaskId}
                                style={styles.cancelDeleteButton}
                                textColor="#667085"
                            >
                                Cancelar
                            </Button>

                            <Button
                                mode="contained"
                                onPress={handleConfirmDeleteTask}
                                loading={!!deletingTaskId}
                                disabled={!!deletingTaskId}
                                style={styles.confirmDeleteButton}
                                buttonColor="#B42318"
                                icon="trash-can-outline"
                            >
                                Eliminar
                            </Button>
                        </View>
                    </Dialog.Content>
                </Dialog>
            </Portal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 2,
    },

    scrollContent: {
        flexGrow: 1,
    },

    backgroundOrbTop: {
        position: "absolute",
        top: -130,
        right: -70,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: "rgba(78,122,40,0.08)",
    },

    backgroundOrbBottom: {
        position: "absolute",
        bottom: -120,
        left: -80,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: "rgba(78,122,40,0.05)",
    },

    header: {
        paddingHorizontal: 10,
        marginBottom: 12,
    },

    title: {
        fontWeight: "800",
        color: "#234015",
        marginBottom: 8,
    },

    subtitle: {
        color: "#5E6E57",
        lineHeight: 21,
        maxWidth: 340,
    },

    filtersCard: {
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E3ECD9",
        elevation: 1,
        marginHorizontal: 6,
        marginBottom: 10,
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
        backgroundColor: "#F6F9F2",
        borderWidth: 1,
        borderColor: "#E3ECD9",
        alignItems: "center",
        justifyContent: "center",
    },

    filtersTitle: {
        fontSize: 13.5,
        fontWeight: "800",
        color: "#344054",
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
        color: "#667085",
    },

    clearFiltersTextHidden: {
        opacity: 0,
    },

    filtersScrollContent: {
        gap: 8,
        paddingRight: 4,
    },

    filterChip: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },

    filterChipSelected: {
        backgroundColor: "rgba(78,122,40,0.10)",
        borderColor: "rgba(78,122,40,0.25)",
    },

    filterChipText: {
        fontSize: 12,
        color: "#667085",
        fontWeight: "700",
    },

    calendarCard: {
        borderRadius: 22,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E3ECD9",
        elevation: 3,
        marginHorizontal: 0,
        marginBottom: 14,
        overflow: "hidden",
    },

    calendarContent: {
        paddingTop: 10,
        paddingBottom: 6,
        paddingHorizontal: 0,
    },

    calendarHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
        marginBottom: 8,
    },

    calendarArrowButton: {
        margin: 0,
        width: 38,
        height: 38,
        borderRadius: 14,
    },

    calendarTitleWrap: {
        alignItems: "center",
        flex: 1,
    },

    calendarTitle: {
        fontSize: 19,
        fontWeight: "900",
        color: "#234015",
        textTransform: "capitalize",
    },

    calendarSubtitle: {
        marginTop: 2,
        fontSize: 11.5,
        fontWeight: "700",
        color: "#667085",
    },

    viewModeSwitch: {
        flexDirection: "row",
        backgroundColor: "#F6F9F2",
        borderWidth: 1,
        borderColor: "#E3ECD9",
        borderRadius: 16,
        padding: 4,
        marginHorizontal: 12,
        marginBottom: 10,
        gap: 4,
    },

    viewModeOption: {
        flex: 1,
        height: 34,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },

    viewModeOptionActive: {
        backgroundColor: "#4E7A28",
    },

    viewModeText: {
        fontSize: 12.5,
        fontWeight: "800",
        color: "#4E7A28",
    },

    viewModeTextActive: {
        color: "#FFFFFF",
    },

    loadingBox: {
        paddingVertical: 34,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },

    loadingText: {
        color: "#667085",
        fontWeight: "600",
    },

    monthCalendar: {
        width: "100%",
    },

    weekHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    weekHeaderCell: {
        height: 24,
        alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#E3ECD9",
    },

    weekHeaderText: {
        fontSize: 11,
        fontWeight: "900",
        color: "#667085",
    },

    monthWeekRow: {
        flexDirection: "row",
        alignItems: "stretch",
    },

    monthDayCell: {
        borderWidth: 0.5,
        borderColor: "#E3ECD9",
        paddingHorizontal: 1,
        paddingTop: 2,
        paddingBottom: 2,
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
    },

    monthDayCellPast: {
        backgroundColor: "#EEF2EC",
        borderColor: "#D1D8CE",
    },

    monthDayCellSelected: {
        backgroundColor: "rgba(78,122,40,0.10)",
    },

    monthDayCellToday: {
        borderColor: "#4E7A28",
        borderWidth: 2,
    },

    monthDayCellPressed: {
        opacity: 0.86,
    },

    monthDayNumber: {
        fontSize: 11,
        fontWeight: "900",
        color: "#1F2937",
        textAlign: "center",
        marginBottom: 2,
    },

    monthDayNumberPast: {
        color: "#475467",
    },

    monthDayNumberDisabled: {
        color: "#AAB2BE",
    },

    monthDayNumberToday: {
        color: "#FFFFFF",
        backgroundColor: "#4E7A28",
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 999,
        overflow: "hidden",
    },

    dayPinnedBadge: {
        position: "absolute",
        top: 1,
        right: 1,
        width: 16,
        height: 16,
        borderRadius: 999,
        backgroundColor: "#F59E0B",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
        borderWidth: 1.5,
        borderColor: "#FFFFFF",
    },

    monthTasksWrap: {
        flex: 1,
        gap: 2,
    },

    monthTaskCard: {
        borderWidth: 1,
        borderRadius: 8,
        minHeight: 29,
        paddingHorizontal: 1,
        paddingVertical: 2,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },

    taskPreviewInitialsRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 1,
    },

    monthTaskInitial: {
        width: 14,
        height: 14,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.85)",
        marginHorizontal: -1,
    },

    monthTaskInitialText: {
        fontSize: 7.5,
        fontWeight: "900",
        color: "#FFFFFF",
        lineHeight: 9,
    },

    monthTaskTitle: {
        width: "100%",
        textAlign: "center",
        fontSize: 7.8,
        fontWeight: "900",
        lineHeight: 8.5,
    },

    monthMoreBadge: {
        alignSelf: "center",
        minWidth: 27,
        height: 14,
        borderRadius: 999,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#ECEFF3",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 5,
        marginTop: 1,
    },

    monthMoreBadgePast: {
        backgroundColor: "#E2E8F0",
        borderColor: "#CBD5E1",
    },

    monthMoreText: {
        fontSize: 8,
        fontWeight: "900",
        color: "#667085",
        lineHeight: 9,
    },

    monthMoreTextPast: {
        color: "#475467",
    },

    weekCalendarScrollContent: {
        paddingHorizontal: 0,
    },

    weekCalendar: {
        minWidth: "100%",
    },

    weekColumnsRow: {
        flexDirection: "row",
        alignItems: "stretch",
    },

    weekDayColumn: {
        minHeight: 390,
        borderWidth: 0.5,
        borderColor: "#E3ECD9",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 2,
        paddingTop: 3,
        paddingBottom: 4,
        overflow: "visible",
    },

    weekDayColumnPast: {
        backgroundColor: "#EEF2EC",
        borderColor: "#D1D8CE",
    },

    weekDayColumnSelected: {
        backgroundColor: "rgba(78,122,40,0.08)",
    },

    weekDayColumnToday: {
        borderColor: "#4E7A28",
        borderWidth: 2,
    },

    weekDayColumnPressed: {
        opacity: 0.88,
    },

    weekPinnedBadge: {
        position: "absolute",
        top: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 999,
        backgroundColor: "#F59E0B",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
        borderWidth: 1.5,
        borderColor: "#FFFFFF",
    },

    weekDayNumber: {
        fontSize: 13,
        fontWeight: "900",
        color: "#1F2937",
        textAlign: "center",
        marginBottom: 4,
    },

    weekDayNumberPast: {
        color: "#475467",
    },

    weekDayNumberToday: {
        color: "#FFFFFF",
        backgroundColor: "#4E7A28",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        overflow: "hidden",
    },

    weekTasksWrap: {
        gap: 5,
    },

    weekTaskCard: {
        borderWidth: 1,
        borderRadius: 10,
        minHeight: 54,
        paddingHorizontal: 3,
        paddingVertical: 5,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },

    weekTaskInitial: {
        width: 18,
        height: 18,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.85)",
        marginHorizontal: -1,
    },

    weekTaskInitialText: {
        fontSize: 8.5,
        fontWeight: "900",
        color: "#FFFFFF",
        lineHeight: 10,
    },

    weekTaskTitle: {
        width: "100%",
        textAlign: "center",
        fontSize: 9,
        fontWeight: "900",
        lineHeight: 11,
    },

    weekEmptySpace: {
        minHeight: 70,
    },

    categoryDialog: {
        borderRadius: 24,
        backgroundColor: "#FFFFFF",
    },

    categoryDialogTitle: {
        color: "#234015",
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
        color: "#344054",
    },

    dialog: {
        borderRadius: 24,
        backgroundColor: "#FFFFFF",
    },

    dialogTitle: {
        color: "#234015",
        fontWeight: "800",
        textTransform: "capitalize",
    },

    reorderHintBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#ECEFF3",
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginHorizontal: 20,
        marginBottom: 10,
    },

    reorderHintText: {
        flex: 1,
        fontSize: 12,
        color: "#667085",
        lineHeight: 17,
        fontWeight: "600",
    },

    dialogScrollArea: {
        paddingHorizontal: 0,
        borderTopWidth: 0,
        borderBottomWidth: 0,
    },

    dialogScroll: {
        maxHeight: 450,
    },

    dragList: {
        maxHeight: 450,
    },

    dialogScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: -5,
    },

    taskItem: {
        borderWidth: 1,
        borderColor: "#E7EEE1",
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginBottom: 12,
    },

    taskItemPinned: {
        borderColor: "rgba(245,158,11,0.35)",
        backgroundColor: "rgba(255,251,235,0.62)",
    },

    taskItemDragging: {
        opacity: 0.94,
        elevation: 5,
        transform: [{ scale: 1.01 }],
    },

    taskTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 10,
    },

    taskAvatarGroup: {
        minWidth: 44,
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 1,
    },

    taskAvatar: {
        width: 34,
        height: 34,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "#FFFFFF",
    },

    taskAvatarText: {
        color: "#FFFFFF",
        fontWeight: "900",
        fontSize: 13,
    },

    taskTitleWrap: {
        flex: 1,
        minWidth: 0,
        paddingTop: 1,
    },

    taskTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: "800",
        color: "#1F2937",
        lineHeight: 21,
    },

    taskAssignedText: {
        marginTop: 2,
        fontSize: 12.5,
        color: "#667085",
        fontWeight: "600",
    },

    taskPriorityActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },

    priorityActionButton: {
        margin: 0,
        width: 31,
        height: 31,
        borderRadius: 12,
    },

    dragHandle: {
        width: 31,
        height: 31,
        borderRadius: 12,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#ECEFF3",
        alignItems: "center",
        justifyContent: "center",
    },

    topTaskChipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 10,
    },

    principalChip: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: "rgba(245,158,11,0.12)",
        borderColor: "rgba(245,158,11,0.28)",
    },

    principalChipText: {
        fontSize: 11.5,
        fontWeight: "800",
        color: "#B7791F",
    },

    categoryChip: {
        alignSelf: "flex-start",
        borderWidth: 1,
    },

    categoryChipText: {
        fontWeight: "800",
        fontSize: 12,
    },

    smallChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 5,
    },

    smallChipText: {
        fontSize: 11.5,
        fontWeight: "700",
    },

    taskDescription: {
        color: "#475467",
        lineHeight: 19,
        marginBottom: 10,
    },

    metaStack: {
        gap: 7,
        marginBottom: 12,
    },

    modalMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    modalMetaText: {
        flex: 1,
        fontSize: 13,
        color: "#667085",
    },

    modalMetaStrong: {
        fontWeight: "800",
        color: "#344054",
    },

    secondaryActionsBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#ECEFF3",
        borderRadius: 14,
        paddingHorizontal: 6,
        paddingVertical: 4,
        marginBottom: 10,
    },

    secondaryActionButton: {
        flex: 1,
        height: 34,
        borderRadius: 11,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },

    secondaryActionButtonPressed: {
        backgroundColor: "#FFFFFF",
    },

    secondaryActionText: {
        fontSize: 12.5,
        fontWeight: "800",
    },

    secondaryActionsDivider: {
        width: 1,
        height: 22,
        backgroundColor: "#E5E7EB",
        marginHorizontal: 2,
    },

    toggleTaskButton: {
        borderRadius: 14,
    },

    toggleTaskButtonContent: {
        height: 42,
    },

    reorderingBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 8,
    },

    reorderingText: {
        fontSize: 12.5,
        fontWeight: "700",
        color: "#667085",
    },

    modalActionsRow: {
        justifyContent: "space-between",
        paddingHorizontal: 15,
        paddingTop: 0,
        paddingBottom: 10,
    },

    modalSmallButton: {
        borderRadius: 14,
    },

    modalSmallButtonLabel: {
        fontSize: 12.5,
        fontWeight: "800",
    },

    emptyDialogBox: {
        paddingTop: 10,
        paddingBottom: 8,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    emptyDialogIconCircle: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: "#F6F9F2",
        borderWidth: 1,
        borderColor: "#E3ECD9",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },

    emptyDialogTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: "#344054",
        textAlign: "center",
    },

    emptyDialogText: {
        fontSize: 13.5,
        color: "#667085",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 8,
    },

    deleteDialog: {
        borderRadius: 24,
        backgroundColor: "#FFFFFF",
    },

    deleteDialogContent: {
        alignItems: "center",
        paddingTop: 24,
        paddingBottom: 18,
    },

    deleteIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#B42318",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },

    deleteDialogTitle: {
        fontWeight: "800",
        color: "#1F2937",
        textAlign: "center",
        marginBottom: 8,
    },

    deleteDialogText: {
        color: "#667085",
        textAlign: "center",
        lineHeight: 21,
        marginBottom: 18,
    },

    deleteDialogStrong: {
        fontWeight: "800",
        color: "#1F2937",
    },

    deleteDialogActions: {
        width: "100%",
        flexDirection: "row",
        gap: 10,
    },

    cancelDeleteButton: {
        flex: 1,
        borderRadius: 16,
        borderColor: "#D0D5DD",
    },

    confirmDeleteButton: {
        flex: 1,
        borderRadius: 16,
    },
});