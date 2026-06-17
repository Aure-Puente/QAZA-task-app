//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
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
import {
    deleteWeeklyObjective,
    getAllWeeklyObjectives,
    toggleWeeklyObjectiveCompleted,
} from "../services/weeklyObjectiveService";

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
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayWeekIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const lastDayWeekIndex = (lastDayOfMonth.getDay() + 6) % 7;

    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - firstDayWeekIndex);

    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(lastDayOfMonth.getDate() + (6 - lastDayWeekIndex));

    const days = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
        days.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
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

function CalendarTaskPreview({
    task,
    variant = "month",
    isPastDay = false,
    styles,
    palette,
    isDarkMode
}) {
    const category = getNoteCategoryByKey(task.categoryKey, isDarkMode);
    const names = getTaskResponsibleNames(task);
    const visibleNames = names.slice(0, variant === "week" ? 4 : 3);
    const extraNames = Math.max(names.length - visibleNames.length, 0);

    return (
        <View
            style={[
                variant === "week" ? styles.weekTaskCard : styles.monthTaskCard,
                {
                    backgroundColor: isPastDay
                        ? "rgba(148,163,184,0.18)"
                        : category.soft,
                    borderColor: isPastDay
                        ? "rgba(100,116,139,0.32)"
                        : category.border,
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
                                backgroundColor: isPastDay
                                    ? "#64748B"
                                    : category.color,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                variant === "week"
                                    ? styles.weekTaskInitialText
                                    : styles.monthTaskInitialText,
                                {
                                    color: isPastDay ? "#FFFFFF" : category.textOnColor,
                                },
                            ]}
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
                                backgroundColor: palette.textMuted,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                variant === "week"
                                    ? styles.weekTaskInitialText
                                    : styles.monthTaskInitialText,
                                { color: "#FFFFFF" },
                            ]}
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
                        color: isPastDay ? palette.textSecondary : category.color,
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

function CalendarObjectivePreview({
    objective,
    variant = "month",
    isPastDay = false,
    styles,
    palette,
    isDarkMode,
    onPress,
}) {
    const category = getNoteCategoryByKey(objective.categoryKey, isDarkMode);
    const names = getObjectiveResponsibleNames(objective);
    const visibleNames = names.slice(0, variant === "week" ? 4 : 3);
    const extraNames = Math.max(names.length - visibleNames.length, 0);

    return (
        <Pressable
            onPress={() => onPress(objective)}
            style={({ pressed }) => [
                variant === "week"
                    ? styles.weekObjectiveCard
                    : styles.monthObjectiveCard,
                {
                    backgroundColor: isPastDay ? "#64748B" : category.color,
                    borderColor: isPastDay ? "#64748B" : category.color,
                },
                pressed && styles.objectivePreviewPressed,
            ]}
        >
            <View style={styles.objectivePreviewInitialsRow}>
                {visibleNames.map((name, index) => (
                    <View
                        key={`${objective.id}-${name}-${index}`}
                        style={[
                            variant === "week"
                                ? styles.weekObjectiveInitial
                                : styles.monthObjectiveInitial,
                            { marginLeft: index === 0 ? 0 : -5 },
                        ]}
                    >
                        <Text
                            style={[
                                variant === "week"
                                    ? styles.weekObjectiveInitialText
                                    : styles.monthObjectiveInitialText,
                                { color: category.textOnColor },
                            ]}
                        >
                            {getInitials(name)}
                        </Text>
                    </View>
                ))}

                {extraNames > 0 ? (
                    <View
                        style={[
                            variant === "week"
                                ? styles.weekObjectiveInitial
                                : styles.monthObjectiveInitial,
                            { marginLeft: -5 },
                        ]}
                    >
                        <Text
                            style={[
                                variant === "week"
                                    ? styles.weekObjectiveInitialText
                                    : styles.monthObjectiveInitialText,
                                { color: category.textOnColor },
                            ]}
                        >
                            +{extraNames}
                        </Text>
                    </View>
                ) : null}
            </View>

            <Text
                style={
                    variant === "week"
                        ? styles.weekObjectiveTitle
                        : styles.monthObjectiveTitle
                }
                numberOfLines={variant === "week" ? 2 : 1}
                ellipsizeMode="tail"
            >
                {objective.title || "Objetivo"}
            </Text>
        </Pressable>
    );
}

function MonthDayCell({
    date,
    currentMonthDate,
    selectedDate,
    todayKey,
    tasksByDate,
    objectiveRowsByDate,
    hiddenObjectivesByDate,
    onPressDay,
    dayCellWidth,
    dayCellHeight,
    styles,
    palette,
    isDarkMode,
    maxVisibleItems = 4,
    taskVariant = "month",
}) {
    const dateKey = toDateKey(date);
    const dayTasks = tasksByDate[dateKey] || [];
    const objectiveRowsCount = objectiveRowsByDate?.[dateKey] || 0;
    const hiddenObjectivesCount = hiddenObjectivesByDate?.[dateKey] || 0;

    const availableTaskSlots =
        maxVisibleItems >= 999
            ? 999
            : Math.max(maxVisibleItems - objectiveRowsCount, 0);

    const visibleTasks = dayTasks.slice(0, availableTaskSlots);
    const hiddenTasksCount =
        maxVisibleItems >= 999
            ? 0
            : Math.max(dayTasks.length - visibleTasks.length, 0);
    const hiddenCount = hiddenObjectivesCount + hiddenTasksCount;

    const isSelected = selectedDate === dateKey;
    const isToday = todayKey === dateKey;
    const isPastDay = isDateBeforeToday(dateKey, todayKey);
    const isCurrentMonth = date.getMonth() === currentMonthDate.getMonth();
    const hasPinnedTask = dayTasks.some((task) => !!task?.isPinned);
    const tasksOffsetTop =
        objectiveRowsCount > 0 ? objectiveRowsCount * 22 + 4 : 0;

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

            <View style={[styles.monthTasksWrap, { marginTop: tasksOffsetTop }]}>
                {visibleTasks.map((task) => (
                    <CalendarTaskPreview
                        key={task.id}
                        task={task}
                        variant={taskVariant}
                        isPastDay={isPastDay}
                        styles={styles}
                        palette={palette}
                        isDarkMode={isDarkMode}
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

function getObjectiveStartDate(objective) {
    if (objective?.startDateTimestamp) {
        const date = new Date(objective.startDateTimestamp);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (objective?.startDate) {
        const date = getDateFromKey(objective.startDate);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
}

function getObjectiveEndDate(objective) {
    if (objective?.endDateTimestamp) {
        const date = new Date(objective.endDateTimestamp);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (objective?.endDate) {
        const date = getDateFromKey(objective.endDate);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
}

function getObjectiveResponsibleNames(objective) {
    const possibleArrays = [
        objective?.assignedUsers,
        objective?.assignedToUsers,
        objective?.assignedToList,
        objective?.responsables,
        objective?.assignedToNames,
    ];

    for (const possibleArray of possibleArrays) {
        if (Array.isArray(possibleArray) && possibleArray.length > 0) {
            const names = possibleArray
                .map((item) => normalizeResponsibleName(item))
                .filter(Boolean);

            if (names.length > 0) return names;
        }
    }

    if (objective?.assignedToName) return [objective.assignedToName];

    return ["?"];
}

function getObjectiveResponsibleIds(objective) {
    const ids = [];

    if (objective?.assignedTo) ids.push(String(objective.assignedTo));

    const possibleArrays = [
        objective?.assignedUsers,
        objective?.assignedToUsers,
        objective?.assignedToList,
        objective?.responsables,
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

function isObjectiveAssignedToUser(objective, userId) {
    if (!userId) return false;

    const responsibleIds = getObjectiveResponsibleIds(objective);
    return responsibleIds.some((id) => String(id) === String(userId));
}

function normalizeObjectiveForCalendar(objective) {
    const startDate = getObjectiveStartDate(objective);
    const endDate = getObjectiveEndDate(objective);

    if (!startDate || !endDate) return null;

    const normalizedStart = new Date(startDate);
    normalizedStart.setHours(0, 0, 0, 0);

    const normalizedEnd = new Date(endDate);
    normalizedEnd.setHours(23, 59, 59, 999);

    return {
        ...objective,
        startDateObject: normalizedStart,
        endDateObject: normalizedEnd,
        startDateKey: toDateKey(normalizedStart),
        endDateKey: toDateKey(normalizedEnd),
    };
}

function doesObjectiveIncludeDate(objective, dateKey) {
    if (!objective?.startDateKey || !objective?.endDateKey || !dateKey) return false;

    return String(objective.startDateKey) <= String(dateKey) && String(dateKey) <= String(objective.endDateKey);
}

function getDateKeysBetween(startDateKey, endDateKey) {
    if (!startDateKey || !endDateKey) return [];

    const start = getDateFromKey(startDateKey);
    const end = getDateFromKey(endDateKey);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const keys = [];
    const cursor = new Date(start);

    while (cursor <= end) {
        keys.push(toDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    return keys;
}

function getObjectiveSegmentsForWeek({ objectives, week, cellWidth, maxVisible = 2 }) {
    if (!Array.isArray(objectives) || !Array.isArray(week) || week.length === 0) {
        return { segments: [], hiddenCount: 0, weekObjectives: [] };
    }

    const weekStartKey = toDateKey(week[0]);
    const weekEndKey = toDateKey(week[week.length - 1]);

    const weekObjectives = objectives
        .filter((objective) => {
            if (!objective?.startDateKey || !objective?.endDateKey) return false;
            return objective.startDateKey <= weekEndKey && objective.endDateKey >= weekStartKey;
        })
        .sort((a, b) => {
            if (a.startDateKey !== b.startDateKey) {
                return a.startDateKey.localeCompare(b.startDateKey);
            }

            return a.endDateKey.localeCompare(b.endDateKey);
        });

    const visibleObjectives = weekObjectives.slice(0, maxVisible);

    const segments = visibleObjectives.map((objective, index) => {
        let startIndex = 0;
        let endIndex = week.length - 1;

        week.forEach((day, dayIndex) => {
            const dayKey = toDateKey(day);

            if (
                dayKey === objective.startDateKey ||
                (dayKey > objective.startDateKey && dayIndex === 0)
            ) {
                startIndex = Math.max(startIndex, dayIndex);
            }

            if (dayKey <= objective.endDateKey) {
                endIndex = dayIndex;
            }
        });

        const left = startIndex * cellWidth + 3;
        const width = Math.max((endIndex - startIndex + 1) * cellWidth - 6, 24);

        return {
            objective,
            left,
            width,
            top: 28 + index * 22,
            rowIndex: index,
        };
    });

    return {
        segments,
        hiddenCount: Math.max(weekObjectives.length - visibleObjectives.length, 0),
        weekObjectives,
    };
}

function WeeklyObjectiveBar({ objective, left, width, top, styles, onPress , isDarkMode}) {
    const category = getNoteCategoryByKey(objective.categoryKey, isDarkMode);
    const names = getObjectiveResponsibleNames(objective);
    const visibleNames = names.slice(0, 3);
    const extraNames = Math.max(names.length - visibleNames.length, 0);

    return (
        <Pressable
            onPress={() => onPress(objective)}
            style={({ pressed }) => [
                styles.weeklyObjectiveBar,
                {
                    left,
                    width,
                    top,
                    backgroundColor: category.color,
                    borderColor: category.color,
                },
                pressed && styles.weeklyObjectiveBarPressed,
            ]}
        >
            <View style={styles.weeklyObjectiveInitialsRow}>
                {visibleNames.map((name, index) => (
                    <View
                        key={`${objective.id}-${name}-${index}`}
                        style={[
                            styles.weeklyObjectiveInitial,
                            { marginLeft: index === 0 ? 0 : -5 },
                        ]}
                    >
                        <Text
                            style={[
                                styles.weeklyObjectiveInitialText,
                                { color: category.textOnColor },
                            ]}
                        >
                            {getInitials(name)}
                        </Text>
                    </View>
                ))}

                {extraNames > 0 ? (
                    <View style={[styles.weeklyObjectiveInitial, { marginLeft: -5 }]}>
                        <Text
                            style={[
                                styles.weeklyObjectiveInitialText,
                                { color: category.textOnColor },
                            ]}
                        >
                            +{extraNames}
                        </Text>                    
                    </View>
                ) : null}
            </View>

            <Text
                style={styles.weeklyObjectiveTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
            >
                {objective.title || "Objetivo semanal"}
            </Text>
        </Pressable>
    );
}

function MonthWeekRowWithObjectives({
    week,
    currentMonthDate,
    selectedDate,
    todayKey,
    tasksByDate,
    objectives,
    onPressDay,
    onPressObjective,
    dayCellWidth,
    dayCellHeight,
    styles,
    palette,
    isDarkMode,
    maxVisibleItems = 4,
    taskVariant = "month",
}) {
    const maxVisibleObjectives = taskVariant === "week" ? 999 : maxVisibleItems;
    const { segments, weekObjectives } = getObjectiveSegmentsForWeek({
        objectives,
        week,
        cellWidth: dayCellWidth,
        maxVisible: maxVisibleObjectives,
    });

    const objectiveRowsByDate = {};
    const hiddenObjectivesByDate = {};

    week.forEach((date) => {
        const dateKey = toDateKey(date);
        const visibleCount = segments.filter((segment) =>
            doesObjectiveIncludeDate(segment.objective, dateKey)
        ).length;
        const totalCount = weekObjectives.filter((objective) =>
            doesObjectiveIncludeDate(objective, dateKey)
        ).length;

        objectiveRowsByDate[dateKey] = visibleCount;
        hiddenObjectivesByDate[dateKey] = Math.max(totalCount - visibleCount, 0);
    });

    return (
        <View style={[styles.monthWeekRowWrapper, { height: dayCellHeight }]}>
            <View style={styles.monthWeekRow}>
                {week.map((date) => (
                    <MonthDayCell
                        key={toDateKey(date)}
                        date={date}
                        currentMonthDate={currentMonthDate}
                        selectedDate={selectedDate}
                        todayKey={todayKey}
                        tasksByDate={tasksByDate}
                        objectiveRowsByDate={objectiveRowsByDate}
                        hiddenObjectivesByDate={hiddenObjectivesByDate}
                        onPressDay={onPressDay}
                        dayCellWidth={dayCellWidth}
                        dayCellHeight={dayCellHeight}
                        styles={styles}
                        palette={palette}
                        isDarkMode={isDarkMode}
                        maxVisibleItems={maxVisibleItems}
                        taskVariant={taskVariant}
                    />
                ))}
            </View>

            <View pointerEvents="box-none" style={styles.weeklyObjectivesLayer}>
                {segments.map((segment) => (
                    <WeeklyObjectiveBar
                        key={`${segment.objective.id}-${toDateKey(week[0])}`}
                        objective={segment.objective}
                        left={segment.left}
                        width={segment.width}
                        top={segment.top}
                        styles={styles}
                        onPress={onPressObjective}
                        isDarkMode={isDarkMode}
                    />
                ))}
            </View>
        </View>
    );
}

function SelectedObjectiveCard({
    objective,
    styles,
    palette,
    onEdit,
    onComplete,
    onDelete,
    updating,
    deleting,
    isDarkMode
}) {
    const category = getNoteCategoryByKey(objective.categoryKey, isDarkMode);
    const responsibleNames = getObjectiveResponsibleNames(objective);

    return (
        <View style={[styles.objectiveModalCard, { borderColor: category.border, backgroundColor: category.soft }]}>
            <View style={styles.objectiveModalTop}>
                <View style={styles.objectiveModalInitialsRow}>
                    {responsibleNames.slice(0, 3).map((name, index) => (
                        <View
                            key={`${objective.id}-modal-${name}-${index}`}
                            style={[
                                styles.objectiveModalInitial,
                                {
                                    backgroundColor: category.color,
                                    marginLeft: index === 0 ? 0 : -8,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.objectiveModalInitialText,
                                    { color: category.textOnColor },
                                ]}
                            >
                                {getInitials(name)}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.objectiveModalTitleWrap}>
                    <Text style={[styles.objectiveModalTitle, { color: category.color }]} numberOfLines={2}>
                        {objective.title || "Objetivo semanal"}
                    </Text>
                    <Text style={styles.objectiveModalSubtitle} numberOfLines={1}>
                        {responsibleNames.join(", ")}
                    </Text>
                </View>
            </View>

            <View style={styles.secondaryActionsBar}>
                <Pressable
                    onPress={() => onEdit(objective)}
                    disabled={updating || deleting}
                    style={({ pressed }) => [
                        styles.secondaryActionButton,
                        pressed && styles.secondaryActionButtonPressed,
                    ]}
                >
                    <MaterialCommunityIcons name="pencil-outline" size={16} color="#2563EB" />
                    <Text style={[styles.secondaryActionText, { color: "#2563EB" }]}>Editar</Text>
                </Pressable>

                <View style={styles.secondaryActionsDivider} />

                <Pressable
                    onPress={() => onComplete(objective)}
                    disabled={updating || deleting}
                    style={({ pressed }) => [
                        styles.secondaryActionButton,
                        pressed && styles.secondaryActionButtonPressed,
                    ]}
                >
                    {updating ? (
                        <ActivityIndicator size={14} color={palette.success} />
                    ) : (
                        <MaterialCommunityIcons name="check-circle-outline" size={16} color={palette.success} />
                    )}
                    <Text style={[styles.secondaryActionText, { color: palette.success }]}>Finalizar</Text>
                </Pressable>

                <View style={styles.secondaryActionsDivider} />

                <Pressable
                    onPress={() => onDelete(objective)}
                    disabled={updating || deleting}
                    style={({ pressed }) => [
                        styles.secondaryActionButton,
                        pressed && styles.secondaryActionButtonPressed,
                    ]}
                >
                    {deleting ? (
                        <ActivityIndicator size={14} color={palette.danger} />
                    ) : (
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color={palette.danger} />
                    )}
                    <Text style={[styles.secondaryActionText, { color: palette.danger }]}>Eliminar</Text>
                </Pressable>
            </View>
        </View>
    );
}
export default function CalendarScreen({ navigation }) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
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

    const todayKey = useMemo(() => toDateKey(new Date()), []);

    const [calendarViewMode, setCalendarViewMode] = useState(CALENDAR_VIEW_MODES.MONTH);
    const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
    const [currentWeekDate, setCurrentWeekDate] = useState(() => new Date());

    const dayCellWidth = useMemo(() => {
        const availableWidth = width - 12;
        return Math.floor(availableWidth / 7);
    }, [width]);

    const dayCellHeight = useMemo(() => {
        return 164;
    }, []);

    const weekColumnWidth = useMemo(() => {
        const availableWidth = width - 12;
        return Math.floor(availableWidth / 7);
    }, [width]);

    const [tasks, setTasks] = useState([]);
    const [weeklyObjectives, setWeeklyObjectives] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
    const [dialogVisible, setDialogVisible] = useState(false);

    const [updatingTaskId, setUpdatingTaskId] = useState(null);
    const [pinningTaskId, setPinningTaskId] = useState(null);
    const [deletingTaskId, setDeletingTaskId] = useState(null);
    const [reordering, setReordering] = useState(false);

    const [updatingObjectiveId, setUpdatingObjectiveId] = useState(null);
    const [deletingObjectiveId, setDeletingObjectiveId] = useState(null);

    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    const [deleteObjectiveDialogVisible, setDeleteObjectiveDialogVisible] = useState(false);
    const [objectiveToDelete, setObjectiveToDelete] = useState(null);

    const [ownerFilter, setOwnerFilter] = useState(null);
    const [contentTypeFilter, setContentTypeFilter] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [filtersExpanded, setFiltersExpanded] = useState(false);

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

    const loadCalendarData = useCallback(async () => {
        try {
            setLoading(true);

            const [tasksData, objectivesData] = await Promise.all([
                getAllTasks(),
                getAllWeeklyObjectives(),
            ]);

            const safeTasks = Array.isArray(tasksData) ? tasksData.filter(Boolean) : [];
            const safeObjectives = Array.isArray(objectivesData)
                ? objectivesData.filter(Boolean)
                : [];

            setTasks(safeTasks);
            setWeeklyObjectives(safeObjectives);

            await syncTaskNotificationsForUser({
                tasks: safeTasks,
                userId: user?.uid,
            });
        } catch (error) {
            console.log("LOAD CALENDAR DATA ERROR:", error);
            setTasks([]);
            setWeeklyObjectives([]);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useFocusEffect(
        useCallback(() => {
            if (user?.uid) {
                loadCalendarData();
            }
        }, [user?.uid, loadCalendarData])
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
            if (contentTypeFilter === "objectives") return false;

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
    }, [datedTasks, ownerFilter, contentTypeFilter, categoryFilter, user?.uid]);

    const normalizedObjectives = useMemo(() => {
        return (weeklyObjectives || [])
            .map((objective) => normalizeObjectiveForCalendar(objective))
            .filter(Boolean)
            .filter((objective) => !objective.completed)
            .filter((objective) => String(objective.endDateKey) >= String(todayKey))
            .sort((a, b) => {
                if (a.startDateKey !== b.startDateKey) {
                    return a.startDateKey.localeCompare(b.startDateKey);
                }

                return a.endDateKey.localeCompare(b.endDateKey);
            });
    }, [weeklyObjectives, todayKey]);

    const filteredObjectives = useMemo(() => {
        return normalizedObjectives.filter((objective) => {
            if (contentTypeFilter === "tasks") return false;

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
    }, [normalizedObjectives, ownerFilter, contentTypeFilter, categoryFilter, user?.uid]);

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

    const objectivesByDate = useMemo(() => {
        return filteredObjectives.reduce((acc, objective) => {
            const dateKeys = getDateKeysBetween(
                objective.startDateKey,
                objective.endDateKey
            );

            dateKeys.forEach((dateKey) => {
                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }

                acc[dateKey].push(objective);
                acc[dateKey].sort((a, b) => {
                    if (a.startDateKey !== b.startDateKey) {
                        return a.startDateKey.localeCompare(b.startDateKey);
                    }

                    return a.endDateKey.localeCompare(b.endDateKey);
                });
            });

            return acc;
        }, {});
    }, [filteredObjectives]);

    const selectedTasks = useMemo(() => {
        return tasksByDate[selectedDate] || [];
    }, [tasksByDate, selectedDate]);

    const selectedObjectives = useMemo(() => {
        return filteredObjectives.filter((objective) =>
            doesObjectiveIncludeDate(objective, selectedDate)
        );
    }, [filteredObjectives, selectedDate]);

    const selectedCategory = useMemo(() => {
        if (!categoryFilter) return null;

        return getNoteCategoryByKey(categoryFilter, isDarkMode);
    }, [categoryFilter, isDarkMode]);

    const monthWeeks = useMemo(() => {
        return getMonthMatrix(currentMonthDate);
    }, [currentMonthDate]);

    const weekDays = useMemo(() => {
        return getWeekDays(currentWeekDate);
    }, [currentWeekDate]);

    const hasActiveFilters = !!ownerFilter || !!contentTypeFilter || !!categoryFilter;
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

    const handleCreateWeeklyObjectiveForSelectedDate = () => {
        setDialogVisible(false);
        navigation.navigate("Crear objetivo semanal", { selectedDate });
    };

    const handleEditWeeklyObjective = (objective) => {
        if (!objective?.id) return;

        setDialogVisible(false);

        navigation.navigate("Editar objetivo semanal", {
            objective,
        });
    };

    const handlePressWeeklyObjective = (objective) => {
        handleEditWeeklyObjective(objective);
    };

    const handleToggleOwnerFilter = (value) => {
        setOwnerFilter((prev) => (prev === value ? null : value));
    };

    const handleToggleContentTypeFilter = (value) => {
        setContentTypeFilter((prev) => (prev === value ? null : value));
    };

    const handleSelectCategoryFilter = (categoryKey) => {
        setCategoryFilter((prev) => (prev === categoryKey ? null : categoryKey));
    };

    const handleClearFilters = () => {
        setOwnerFilter(null);
        setContentTypeFilter(null);
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

            await loadCalendarData();
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

            await loadCalendarData();
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

            await loadCalendarData();
        } catch (error) {
            console.log("DELETE TASK ERROR:", error);
        } finally {
            setDeletingTaskId(null);
        }
    };

    const handleCompleteWeeklyObjective = async (objective) => {
        if (!objective?.id) return;

        try {
            setUpdatingObjectiveId(objective.id);

            await toggleWeeklyObjectiveCompleted(objective.id, true);

            setWeeklyObjectives((prevObjectives) =>
                prevObjectives.filter((item) => String(item.id) !== String(objective.id))
            );

            await loadCalendarData();
        } catch (error) {
            console.log("COMPLETE WEEKLY OBJECTIVE ERROR:", error);
            Alert.alert("Error", "No se pudo finalizar el objetivo semanal.");
        } finally {
            setUpdatingObjectiveId(null);
        }
    };

    const handleAskDeleteWeeklyObjective = (objective) => {
        if (!objective?.id) return;

        setObjectiveToDelete(objective);
        setDeleteObjectiveDialogVisible(true);
    };

    const handleCloseDeleteObjectiveDialog = () => {
        if (deletingObjectiveId) return;

        setDeleteObjectiveDialogVisible(false);
        setObjectiveToDelete(null);
    };

    const handleConfirmDeleteWeeklyObjective = async () => {
        if (!objectiveToDelete?.id) return;

        try {
            setDeletingObjectiveId(objectiveToDelete.id);

            await deleteWeeklyObjective(objectiveToDelete.id);

            setWeeklyObjectives((prevObjectives) =>
                prevObjectives.filter(
                    (objective) => String(objective.id) !== String(objectiveToDelete.id)
                )
            );

            setDeleteObjectiveDialogVisible(false);
            setObjectiveToDelete(null);

            await loadCalendarData();
        } catch (error) {
            console.log("DELETE WEEKLY OBJECTIVE ERROR:", error);
            Alert.alert("Error", "No se pudo eliminar el objetivo semanal.");
        } finally {
            setDeletingObjectiveId(null);
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

            await loadCalendarData();
        } catch (error) {
            console.log("REORDER TASKS ERROR:", error);
        } finally {
            setReordering(false);
        }
    };

            const renderSelectedObjectivesHeader = () => {
            if (selectedObjectives.length === 0) return null;

            return (
                <View style={styles.selectedObjectivesWrap}>
                    <Text style={styles.selectedObjectivesTitle}>
                        Objetivos semanales
                    </Text>

                    {selectedObjectives.map((objective) => (
                        <SelectedObjectiveCard
                            key={objective.id}
                            objective={objective}
                            styles={styles}
                            palette={palette}
                            updating={updatingObjectiveId === objective.id}
                            deleting={deletingObjectiveId === objective.id}
                            onEdit={handleEditWeeklyObjective}
                            onComplete={handleCompleteWeeklyObjective}
                            onDelete={handleAskDeleteWeeklyObjective}
                            isDarkMode={isDarkMode}
                        />
                    ))}
                </View>
            );
};


    const renderTaskItem = ({ item: task, drag, isActive }) => {
        const category = getNoteCategoryByKey(task.categoryKey, isDarkMode);
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
                                    <Text
                                        style={[
                                            styles.taskAvatarText,
                                            { color: category.textOnColor },
                                        ]}
                                    >
                                        {getInitials(name)}
                                    </Text>
                                </View>
                            ))}

                            {responsibleNames.length > 3 ? (
                                <View
                                    style={[
                                        styles.taskAvatar,
                                        {
                                            backgroundColor: palette.textMuted,
                                            marginLeft: -8,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.taskAvatarText,
                                            { color: "#FFFFFF" },
                                        ]}
                                    >
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
                                iconColor={task.isPinned ? palette.warning : palette.textMuted}
                                containerColor={
                                    task.isPinned
                                        ? "rgba(245,158,11,0.16)"
                                        : isDarkMode
                                        ? "rgba(255,255,255,0.035)"
                                        : "#F8FAFC"
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
                                            color={palette.textMuted}
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
                                color={palette.textMuted}
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
                                color={palette.textMuted}
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
                                <ActivityIndicator size={14} color={palette.danger} />
                            ) : (
                                <MaterialCommunityIcons
                                    name="trash-can-outline"
                                    size={16}
                                    color={palette.danger}
                                />
                            )}

                            <Text
                                style={[
                                    styles.secondaryActionText,
                                    { color: palette.danger },
                                ]}
                            >
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
                        buttonColor={palette.primary}
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
                        backgroundColor: palette.background,
                        paddingTop: insets.top + 6,
                    },
                ]}
            >
                <StatusBar
                    barStyle={isDarkMode ? "light-content" : "dark-content"}
                    backgroundColor={palette.background}
                />

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
                            Visualizá las tareas pendientes y objetivos semanales por día, responsable y categoría.
                        </Text>
                    </View>

                    <Card style={styles.filtersCard}>
                        <Card.Content style={styles.filtersContent}>
                            <Pressable
                                onPress={() => setFiltersExpanded((prev) => !prev)}
                                style={({ pressed }) => [
                                    styles.filtersTopRow,
                                    pressed && styles.filtersTopRowPressed,
                                    !filtersExpanded && styles.filtersTopRowClosed,
                                ]}
                            >
                                <View style={styles.filtersTitleRow}>
                                    <View style={styles.filtersIconWrap}>
                                        <MaterialCommunityIcons
                                            name="filter-variant"
                                            size={15}
                                            color={palette.primary}
                                        />
                                    </View>

                                    <View style={styles.filtersTitleTextWrap}>
                                        <Text style={styles.filtersTitle}>Filtros</Text>

                                        <Text style={styles.filtersSubtitle}>
                                            {hasActiveFilters
                                                ? "Hay filtros activos"
                                                : "Tocá para mostrar u ocultar"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.filtersHeaderActions}>
                                    {hasActiveFilters ? (
                                        <Pressable
                                            onPress={(event) => {
                                                event.stopPropagation?.();
                                                handleClearFilters();
                                            }}
                                            hitSlop={8}
                                            style={styles.clearFiltersPressable}
                                        >
                                            <Text style={styles.clearFiltersText}>Limpiar</Text>
                                        </Pressable>
                                    ) : null}

                                    <MaterialCommunityIcons
                                        name={filtersExpanded ? "chevron-up" : "chevron-down"}
                                        size={22}
                                        color={palette.textMuted}
                                    />
                                </View>
                            </Pressable>

                            {filtersExpanded ? (
                                <View style={styles.filtersAccordionContent}>
                                    <View style={styles.filterGroup}>
                                        <Text style={styles.filterGroupTitle}>Responsable</Text>

                                        <View style={styles.filterChipsWrap}>
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
                                                        color: palette.primary,
                                                        fontWeight: "800",
                                                    },
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
                                                    ownerFilter === "others" && styles.filterChipSelected,
                                                ]}
                                                textStyle={[
                                                    styles.filterChipText,
                                                    ownerFilter === "others" && {
                                                        color: palette.primary,
                                                        fontWeight: "800",
                                                    },
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
                                        </View>
                                    </View>

                                    <View style={styles.filterGroup}>
                                        <Text style={styles.filterGroupTitle}>Tipo</Text>

                                        <View style={styles.filterChipsWrap}>
                                            <Chip
                                                compact
                                                selected={contentTypeFilter === "tasks"}
                                                onPress={() => handleToggleContentTypeFilter("tasks")}
                                                showSelectedCheck={false}
                                                style={[
                                                    styles.filterChip,
                                                    contentTypeFilter === "tasks" && styles.filterChipSelected,
                                                ]}
                                                textStyle={[
                                                    styles.filterChipText,
                                                    contentTypeFilter === "tasks" && {
                                                        color: palette.primary,
                                                        fontWeight: "800",
                                                    },
                                                ]}
                                                icon={() => (
                                                    <MaterialCommunityIcons
                                                        name="checkbox-marked-circle-outline"
                                                        size={14}
                                                        color={
                                                            contentTypeFilter === "tasks"
                                                                ? palette.primary
                                                                : palette.textMuted
                                                        }
                                                    />
                                                )}
                                            >
                                                Tareas
                                            </Chip>

                                            <Chip
                                                compact
                                                selected={contentTypeFilter === "objectives"}
                                                onPress={() => handleToggleContentTypeFilter("objectives")}
                                                showSelectedCheck={false}
                                                style={[
                                                    styles.filterChip,
                                                    contentTypeFilter === "objectives" && styles.filterChipSelected,
                                                ]}
                                                textStyle={[
                                                    styles.filterChipText,
                                                    contentTypeFilter === "objectives" && {
                                                        color: palette.primary,
                                                        fontWeight: "800",
                                                    },
                                                ]}
                                                icon={() => (
                                                    <MaterialCommunityIcons
                                                        name="flag-outline"
                                                        size={14}
                                                        color={
                                                            contentTypeFilter === "objectives"
                                                                ? palette.primary
                                                                : palette.textMuted
                                                        }
                                                    />
                                                )}
                                            >
                                                Objetivos semanales
                                            </Chip>
                                        </View>
                                    </View>

                                    <View style={styles.filterGroup}>
                                        <Text style={styles.filterGroupTitle}>Categorías</Text>

                                        <View style={styles.filterChipsWrap}>
                                            {NOTE_CATEGORIES.map((item) => {
                                                const category = getNoteCategoryByKey(item.key, isDarkMode);
                                                const selected = item.key === categoryFilter;

                                                return (
                                                    <Chip
                                                        key={category.key}
                                                        compact
                                                        selected={selected}
                                                        onPress={() => handleSelectCategoryFilter(category.key)}
                                                        showSelectedCheck={false}
                                                        style={[
                                                            styles.filterChip,
                                                            selected && {
                                                                backgroundColor: category.soft,
                                                                borderColor: category.border,
                                                            },
                                                        ]}
                                                        textStyle={[
                                                            styles.filterChipText,
                                                            selected && {
                                                                color: category.color,
                                                                fontWeight: "800",
                                                            },
                                                        ]}
                                                        icon={() => (
                                                            <MaterialCommunityIcons
                                                                name={category.icon}
                                                                size={14}
                                                                color={selected ? category.color : palette.textMuted}
                                                            />
                                                        )}
                                                    >
                                                        {category.label}
                                                    </Chip>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </View>
                            ) : null}
                        </Card.Content>
                    </Card>

                    <Card style={styles.calendarCard}>
                        <Card.Content style={styles.calendarContent}>
                            <View style={styles.calendarHeader}>
                                <IconButton
                                    icon="chevron-left"
                                    size={22}
                                    iconColor={palette.primary}
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
                                    iconColor={palette.primary}
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
                                    onPress={() =>
                                        handleChangeCalendarViewMode(CALENDAR_VIEW_MODES.MONTH)
                                    }
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
                                                : palette.primary
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
                                    onPress={() =>
                                        handleChangeCalendarViewMode(CALENDAR_VIEW_MODES.WEEK)
                                    }
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
                                                : palette.primary
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
                                    <ActivityIndicator size="small" color={palette.primary} />

                                    <Text style={styles.loadingText}>
                                        Cargando calendario...
                                    </Text>
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
                                        <MonthWeekRowWithObjectives
                                            key={`week-${weekIndex}`}
                                            week={week}
                                            currentMonthDate={currentMonthDate}
                                            selectedDate={selectedDate}
                                            todayKey={todayKey}
                                            tasksByDate={tasksByDate}
                                            objectives={filteredObjectives}
                                            onPressDay={handleDayPress}
                                            onPressObjective={handlePressWeeklyObjective}
                                            dayCellWidth={dayCellWidth}
                                            dayCellHeight={dayCellHeight}
                                            styles={styles}
                                            palette={palette}
                                            isDarkMode={false}
                                            maxVisibleItems={4}
                                        />
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

                                        <MonthWeekRowWithObjectives
                                            week={weekDays}
                                            currentMonthDate={currentWeekDate}
                                            selectedDate={selectedDate}
                                            todayKey={todayKey}
                                            tasksByDate={tasksByDate}
                                            objectives={filteredObjectives}
                                            onPressDay={handleDayPress}
                                            onPressObjective={handlePressWeeklyObjective}
                                            dayCellWidth={weekColumnWidth}
                                            dayCellHeight={420}
                                            styles={styles}
                                            palette={palette}
                                            isDarkMode={false}
                                            maxVisibleItems={999}
                                            taskVariant="week"
                                        />
                                    </View>
                                </ScrollView>
                            )}
                        </Card.Content>
                    </Card>
                </ScrollView>
            </View>

            <Portal>
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
                            <MaterialCommunityIcons
                                name="gesture-tap-hold"
                                size={15}
                                color={palette.textMuted}
                            />

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
                                ListHeaderComponent={renderSelectedObjectivesHeader}
                                ListFooterComponent={
                                    reordering ? (
                                        <View style={styles.reorderingBox}>
                                            <ActivityIndicator size="small" color={palette.primary} />

                                            <Text style={styles.reorderingText}>
                                                Guardando orden...
                                            </Text>
                                        </View>
                                    ) : null
                                }
                            />
                        ) : selectedObjectives.length > 0 ? (
                            <ScrollView
                                style={styles.dialogScroll}
                                contentContainerStyle={styles.dialogScrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {renderSelectedObjectivesHeader()}
                            </ScrollView>
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
                                            color={palette.primary}
                                        />
                                    </View>

                                    <Text style={styles.emptyDialogTitle}>
                                        Sin tareas pendientes
                                    </Text>

                                    <Text style={styles.emptyDialogText}>
                                        No hay tareas pendientes ni objetivos para {formatDateShort(selectedDate)}.
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
                            textColor={palette.textSecondary}
                            style={styles.modalSmallButton}
                            labelStyle={styles.modalSmallButtonLabel}
                        >
                            Cerrar
                        </Button>

                        <Button
                            mode="outlined"
                            compact
                            onPress={handleCreateTaskForSelectedDate}
                            textColor={palette.primary}
                            style={styles.modalSmallButton}
                            labelStyle={styles.modalSmallButtonLabel}
                            icon="plus"
                        >
                            Nueva tarea
                        </Button>

                        <Button
                            mode="contained"
                            compact
                            onPress={handleCreateWeeklyObjectiveForSelectedDate}
                            buttonColor={palette.primary}
                            textColor="#FFFFFF"
                            style={styles.modalSmallButton}
                            labelStyle={styles.modalSmallButtonLabel}
                            icon="flag-plus-outline"
                        >
                            Objetivo
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
                                textColor={palette.textSecondary}
                            >
                                Cancelar
                            </Button>

                            <Button
                                mode="contained"
                                onPress={handleConfirmDeleteTask}
                                loading={!!deletingTaskId}
                                disabled={!!deletingTaskId}
                                style={styles.confirmDeleteButton}
                                buttonColor={palette.danger}
                                textColor="#FFFFFF"
                                icon="trash-can-outline"
                            >
                                Eliminar
                            </Button>
                        </View>
                    </Dialog.Content>
                </Dialog>

                <Dialog
                    visible={deleteObjectiveDialogVisible}
                    onDismiss={handleCloseDeleteObjectiveDialog}
                    style={styles.deleteDialog}
                >
                    <Dialog.Content style={styles.deleteDialogContent}>
                        <View style={styles.deleteIconCircle}>
                            <MaterialCommunityIcons
                                name="flag-remove-outline"
                                size={28}
                                color="#FFFFFF"
                            />
                        </View>

                        <Text variant="titleLarge" style={styles.deleteDialogTitle}>
                            Eliminar objetivo
                        </Text>

                        <Text variant="bodyMedium" style={styles.deleteDialogText}>
                            ¿Querés eliminar{" "}
                            <Text style={styles.deleteDialogStrong}>
                                {objectiveToDelete?.title || "este objetivo semanal"}
                            </Text>
                            ? Esta acción no se puede deshacer.
                        </Text>

                        <View style={styles.deleteDialogActions}>
                            <Button
                                mode="outlined"
                                onPress={handleCloseDeleteObjectiveDialog}
                                disabled={!!deletingObjectiveId}
                                style={styles.cancelDeleteButton}
                                textColor={palette.textSecondary}
                            >
                                Cancelar
                            </Button>

                            <Button
                                mode="contained"
                                onPress={handleConfirmDeleteWeeklyObjective}
                                loading={!!deletingObjectiveId}
                                disabled={!!deletingObjectiveId}
                                style={styles.confirmDeleteButton}
                                buttonColor={palette.danger}
                                textColor="#FFFFFF"
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

function createStyles(palette, isDarkMode) {
    return StyleSheet.create({
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
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.08)"
                : "rgba(209, 107, 24, 0.06)",
        },

        backgroundOrbBottom: {
            position: "absolute",
            bottom: -120,
            left: -80,
            width: 240,
            height: 240,
            borderRadius: 120,
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.055)"
                : "rgba(209, 107, 24, 0.045)",
        },

        header: {
            paddingHorizontal: 10,
            marginBottom: 12,
        },

        title: {
            fontWeight: "900",
            color: palette.text,
            marginBottom: 8,
        },

        subtitle: {
            color: palette.textSecondary,
            lineHeight: 21,
            maxWidth: 360,
        },

        filtersCard: {
            borderRadius: 20,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            elevation: 1,
            shadowColor: palette.shadow,
            shadowOpacity: isDarkMode ? 0.15 : 0.05,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            marginHorizontal: 6,
            marginBottom: 10,
        },

        filtersContent: {
            paddingHorizontal: 12,
            paddingTop: 11,
            paddingBottom: 11,
        },

        filtersTopRow: {
            minHeight: 42,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            overflow: "hidden",
        },

        filtersTopRowClosed: {
            minHeight: 40,
        },

        filtersTopRowPressed: {
            opacity: 0.88,
        },

        filtersTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            flex: 1,
        },

        filtersIconWrap: {
            width: 30,
            height: 30,
            borderRadius: 11,
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

        filtersTitleTextWrap: {
            flex: 1,
        },

        filtersTitle: {
            fontSize: 13.5,
            fontWeight: "800",
            color: palette.text,
        },

        filtersSubtitle: {
            marginTop: 1,
            fontSize: 11.2,
            fontWeight: "700",
            color: palette.textSecondary,
        },

        filtersHeaderActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },

        clearFiltersPressable: {
            minWidth: 58,
            height: 28,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#F8FAFC",
            borderWidth: 1,
            borderColor: palette.border,
        },

        clearFiltersText: {
            fontSize: 12,
            fontWeight: "800",
            color: palette.textSecondary,
        },

        filtersAccordionContent: {
            paddingTop: 12,
            gap: 13,
        },

        filterGroup: {
            gap: 8,
        },

        filterGroupTitle: {
            fontSize: 12,
            fontWeight: "900",
            color: palette.text,
        },

        filterChipsWrap: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
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
                ? "rgba(240, 138, 43, 0.13)"
                : "rgba(209, 107, 24, 0.10)",
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.26)"
                : "rgba(209, 107, 24, 0.22)",
        },

        filterChipText: {
            fontSize: 12,
            color: palette.textSecondary,
            fontWeight: "700",
        },

        calendarCard: {
            borderRadius: 22,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            elevation: 3,
            shadowColor: palette.shadow,
            shadowOpacity: isDarkMode ? 0.18 : 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
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
            color: palette.text,
            textTransform: "capitalize",
        },

        calendarSubtitle: {
            marginTop: 2,
            fontSize: 11.5,
            fontWeight: "700",
            color: palette.textSecondary,
        },

        viewModeSwitch: {
            flexDirection: "row",
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#FAF8F5",
            borderWidth: 1,
            borderColor: palette.border,
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
            backgroundColor: palette.primary,
        },

        viewModeText: {
            fontSize: 12.5,
            fontWeight: "800",
            color: palette.primary,
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
            color: palette.textSecondary,
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
            borderBottomColor: palette.border,
        },

        weekHeaderText: {
            fontSize: 11,
            fontWeight: "900",
            color: palette.textSecondary,
        },

        monthWeekRowWrapper: {
            position: "relative",
            overflow: "hidden",
        },

        monthWeekRow: {
            flexDirection: "row",
            alignItems: "stretch",
        },

        weeklyObjectivesLayer: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
        },

        weeklyObjectiveBar: {
            position: "absolute",
            height: 18,
            borderRadius: 999,
            borderWidth: 1,
            paddingHorizontal: 5,
            flexDirection: "row",
            alignItems: "center",
            overflow: "hidden",
            zIndex: 40,
            elevation: 3,
        },

        weeklyObjectiveBarPressed: {
            opacity: 0.86,
            transform: [{ scale: 0.995 }],
        },

        weeklyObjectiveInitialsRow: {
            flexDirection: "row",
            alignItems: "center",
            marginRight: 4,
        },

        weeklyObjectiveInitial: {
            width: 14,
            height: 14,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.24)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.65)",
            alignItems: "center",
            justifyContent: "center",
        },

        weeklyObjectiveInitialText: {
            fontSize: 7.5,
            fontWeight: "900",
            lineHeight: 9,
        },

        weeklyObjectiveTitle: {
            flex: 1,
            fontSize: 9.5,
            fontWeight: "900",
            color: "#FFFFFF",
            lineHeight: 11,
        },

        objectivePreviewPressed: {
            opacity: 0.86,
        },

        monthObjectiveCard: {
            borderWidth: 1,
            borderRadius: 999,
            minHeight: 18,
            paddingHorizontal: 4,
            paddingVertical: 1,
            flexDirection: "row",
            alignItems: "center",
            overflow: "hidden",
        },

        weekObjectiveCard: {
            borderWidth: 1,
            borderRadius: 12,
            minHeight: 38,
            paddingHorizontal: 5,
            paddingVertical: 4,
            flexDirection: "row",
            alignItems: "center",
            overflow: "hidden",
        },

        objectivePreviewInitialsRow: {
            flexDirection: "row",
            alignItems: "center",
            marginRight: 4,
        },

        monthObjectiveInitial: {
            width: 14,
            height: 14,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.24)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.65)",
            alignItems: "center",
            justifyContent: "center",
        },

        monthObjectiveInitialText: {
            fontSize: 7.5,
            fontWeight: "900",
            lineHeight: 9,
        },

        monthObjectiveTitle: {
            flex: 1,
            fontSize: 8.8,
            fontWeight: "900",
            color: "#FFFFFF",
            lineHeight: 10,
        },

        weekObjectiveInitial: {
            width: 18,
            height: 18,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.24)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.65)",
            alignItems: "center",
            justifyContent: "center",
        },

        weekObjectiveInitialText: {
            fontSize: 8.5,
            fontWeight: "900",
            lineHeight: 10,
        },

        weekObjectiveTitle: {
            flex: 1,
            fontSize: 9,
            fontWeight: "900",
            color: "#FFFFFF",
            lineHeight: 11,
        },

        weeklyObjectiveHiddenBadge: {
            position: "absolute",
            top: 72,
            right: 5,
            minWidth: 25,
            height: 16,
            borderRadius: 999,
            backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.12)"
                : "rgba(15,23,42,0.12)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 6,
            zIndex: 40,
        },

        weeklyObjectiveHiddenText: {
            fontSize: 9,
            fontWeight: "900",
            color: palette.text,
        },

        monthDayCell: {
            borderWidth: 0.5,
            borderColor: palette.border,
            paddingHorizontal: 1,
            paddingTop: 22,
            paddingBottom: 2,
            overflow: "hidden",
            backgroundColor: palette.card,
        },

        monthDayCellPast: {
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.025)" : "#F1EDE8",
            borderColor: isDarkMode ? "rgba(255,255,255,0.07)" : "#DDD5CE",
        },

        monthDayCellSelected: {
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.10)"
                : "rgba(209, 107, 24, 0.09)",
        },

        monthDayCellToday: {
            borderColor: palette.primary,
            borderWidth: 2,
        },

        monthDayCellPressed: {
            opacity: 0.86,
        },

        monthDayNumber: {
            position: "absolute",
            top: 4,
            left: 0,
            right: 0,
            zIndex: 60,
            fontSize: 11,
            fontWeight: "900",
            color: palette.text,
            textAlign: "center",
            marginBottom: 2,
        },

        monthDayNumberPast: {
            color: palette.textMuted,
        },

        monthDayNumberDisabled: {
            color: isDarkMode ? "rgba(255,255,255,0.22)" : "#B5AAA0",
        },

        monthDayNumberToday: {
            color: "#FFFFFF",
            backgroundColor: palette.primary,
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
            borderColor: palette.card,
        },

        monthTasksWrap: {
            flex: 1,
            gap: 2,
        },

        monthTaskCard: {
            borderWidth: 1,
            borderRadius: 8,
            minHeight: 25,
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
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#F8FAFC",
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 5,
            marginTop: 1,
        },

        monthMoreBadgePast: {
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.045)" : "#E2E8F0",
            borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#CBD5E1",
        },

        monthMoreText: {
            fontSize: 8,
            fontWeight: "900",
            color: palette.textSecondary,
            lineHeight: 9,
        },

        monthMoreTextPast: {
            color: palette.textMuted,
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
            borderColor: palette.border,
            backgroundColor: palette.card,
            paddingHorizontal: 2,
            paddingTop: 50,
            paddingBottom: 4,
            overflow: "visible",
        },

        weekDayColumnPast: {
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.025)" : "#F1EDE8",
            borderColor: isDarkMode ? "rgba(255,255,255,0.07)" : "#DDD5CE",
        },

        weekDayColumnSelected: {
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.09)"
                : "rgba(209, 107, 24, 0.08)",
        },

        weekDayColumnToday: {
            borderColor: palette.primary,
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
            borderColor: palette.card,
        },

        weekDayNumber: {
            fontSize: 13,
            fontWeight: "900",
            color: palette.text,
            textAlign: "center",
            marginBottom: 4,
        },

        weekDayNumberPast: {
            color: palette.textMuted,
        },

        weekDayNumberToday: {
            color: "#FFFFFF",
            backgroundColor: palette.primary,
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

        selectedObjectivesWrap: {
            paddingHorizontal: 0,
            paddingTop: 4,
            paddingBottom: 4,
        },

        selectedObjectivesTitle: {
            fontSize: 13,
            fontWeight: "900",
            color: palette.text,
            marginBottom: 8,
        },

        objectiveModalCard: {
            borderWidth: 1,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 13,
            marginBottom: 12,
        },

        objectiveModalTop: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
        },

        objectiveModalInitialsRow: {
            minWidth: 44,
            flexDirection: "row",
            alignItems: "center",
        },

        objectiveModalInitial: {
            width: 34,
            height: 34,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: palette.card,
        },

        objectiveModalInitialText: {
            fontWeight: "900",
            fontSize: 13,
        },

        objectiveModalTitleWrap: {
            flex: 1,
            minWidth: 0,
        },

        objectiveModalTitle: {
            fontSize: 15,
            fontWeight: "900",
            lineHeight: 21,
        },

        objectiveModalSubtitle: {
            marginTop: 2,
            fontSize: 12.5,
            color: palette.textSecondary,
            fontWeight: "700",
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
            maxHeight: 390,
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

        dialog: {
            borderRadius: 24,
            backgroundColor: palette.card,
        },

        dialogTitle: {
            color: palette.text,
            fontWeight: "800",
            textTransform: "capitalize",
        },

        reorderHintBox: {
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#F8FAFC",
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 8,
            marginHorizontal: 20,
            marginBottom: 10,
        },

        reorderHintText: {
            flex: 1,
            fontSize: 12,
            color: palette.textSecondary,
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
            maxHeight: 390,
        },

        dialogScrollContent: {
            paddingHorizontal: 20,
            paddingBottom: 12,
        },

        taskItem: {
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.card,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 13,
            marginBottom: 12,
        },

        taskItemPinned: {
            borderColor: "rgba(245,158,11,0.35)",
            backgroundColor: isDarkMode
                ? "rgba(245,158,11,0.08)"
                : "rgba(255,251,235,0.62)",
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
            borderColor: palette.card,
        },

        taskAvatarText: {
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
            color: palette.text,
            lineHeight: 21,
        },

        taskAssignedText: {
            marginTop: 2,
            fontSize: 12.5,
            color: palette.textSecondary,
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
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#F8FAFC",
            borderWidth: 1,
            borderColor: palette.border,
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
            color: palette.warning,
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
            color: palette.textSecondary,
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
            color: palette.textSecondary,
        },

        modalMetaStrong: {
            fontWeight: "800",
            color: palette.text,
        },

        secondaryActionsBar: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.035)" : "#F8FAFC",
            borderWidth: 1,
            borderColor: palette.border,
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
            backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "#FFFFFF",
        },

        secondaryActionText: {
            fontSize: 12.5,
            fontWeight: "800",
        },

        secondaryActionsDivider: {
            width: 1,
            height: 22,
            backgroundColor: palette.border,
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
            color: palette.textSecondary,
        },

        modalActionsRow: {
            justifyContent: "space-between",
            paddingHorizontal: 15,
            paddingTop: 0,
            paddingBottom: 10,
            gap: 6,
        },

        modalSmallButton: {
            borderRadius: 14,
        },

        modalSmallButtonLabel: {
            fontSize: 12,
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
            backgroundColor: isDarkMode
                ? "rgba(240, 138, 43, 0.11)"
                : "rgba(209, 107, 24, 0.08)",
            borderWidth: 1,
            borderColor: isDarkMode
                ? "rgba(240, 138, 43, 0.22)"
                : "rgba(209, 107, 24, 0.18)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
        },

        emptyDialogTitle: {
            fontSize: 15,
            fontWeight: "800",
            color: palette.text,
            textAlign: "center",
        },

        emptyDialogText: {
            fontSize: 13.5,
            color: palette.textSecondary,
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 8,
        },

        deleteDialog: {
            borderRadius: 24,
            backgroundColor: palette.card,
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
            backgroundColor: palette.danger,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
        },

        deleteDialogTitle: {
            fontWeight: "800",
            color: palette.text,
            textAlign: "center",
            marginBottom: 8,
        },

        deleteDialogText: {
            color: palette.textSecondary,
            textAlign: "center",
            lineHeight: 21,
            marginBottom: 18,
        },

        deleteDialogStrong: {
            fontWeight: "800",
            color: palette.text,
        },

        deleteDialogActions: {
            width: "100%",
            flexDirection: "row",
            gap: 10,
        },

        cancelDeleteButton: {
            flex: 1,
            borderRadius: 16,
            borderColor: palette.border,
        },

        confirmDeleteButton: {
            flex: 1,
            borderRadius: 16,
        },
    });
}