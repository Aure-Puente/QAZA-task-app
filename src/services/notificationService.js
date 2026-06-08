//Importaciones:
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

//JS:
const TASK_NOTIFICATION_CHANNEL_ID = "task-reminders";
const TASK_NOTIFICATION_PREFIX = "task-reminder:";
const DAYS_TO_SCHEDULE_AFTER_DUE_DATE = 30;

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
    });

    export async function setupTaskNotifications() {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(TASK_NOTIFICATION_CHANNEL_ID, {
        name: "Recordatorios de tareas",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4E7A28",
        });
    }

    const currentPermissions = await Notifications.getPermissionsAsync();

    if (currentPermissions.granted) {
        return true;
    }

    const requestedPermissions = await Notifications.requestPermissionsAsync({
        ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
        },
    });

    return requestedPermissions.granted;
    }

    function getTaskDate(task) {
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

    function getStartOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
    }

    function getNotificationKey(taskId) {
    return `${TASK_NOTIFICATION_PREFIX}${taskId}`;
    }

    function getNotificationInstanceKey(taskId, index) {
    return `${TASK_NOTIFICATION_PREFIX}${taskId}:${index}`;
    }

    async function getScheduledTaskNotifications() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    return scheduled.filter((item) => {
        const taskNotificationKey = item?.content?.data?.taskNotificationKey;

        return (
        typeof taskNotificationKey === "string" &&
        taskNotificationKey.startsWith(TASK_NOTIFICATION_PREFIX)
        );
    });
    }

    export async function cancelTaskNotification(taskId) {
    if (!taskId) return;

    const notificationKey = getNotificationKey(taskId);
    const scheduledTaskNotifications = await getScheduledTaskNotifications();

    const notificationsToCancel = scheduledTaskNotifications.filter((item) => {
        const taskNotificationKey = item?.content?.data?.taskNotificationKey;
        return String(taskNotificationKey).startsWith(notificationKey);
    });

    await Promise.all(
        notificationsToCancel.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
        )
    );
    }

    export async function scheduleTaskNotification(task) {
    if (!task?.id) return;

    await cancelTaskNotification(task.id);

    if (task.completed) return;

    const taskDate = getTaskDate(task);
    if (!taskDate) return;

    const todayStart = getStartOfToday();

    const firstReminderDate = new Date(taskDate);
    firstReminderDate.setHours(8, 0, 0, 0);

    if (firstReminderDate.getTime() < Date.now()) {
        firstReminderDate.setTime(todayStart.getTime());
        firstReminderDate.setHours(8, 0, 0, 0);

        if (firstReminderDate.getTime() < Date.now()) {
        firstReminderDate.setDate(firstReminderDate.getDate() + 1);
        }
    }

    const notificationsToCreate = [];

    for (let index = 0; index < DAYS_TO_SCHEDULE_AFTER_DUE_DATE; index += 1) {
        const notificationDate = new Date(firstReminderDate);
        notificationDate.setDate(firstReminderDate.getDate() + index);

        if (notificationDate.getTime() <= Date.now()) {
        continue;
        }

        notificationsToCreate.push(
        Notifications.scheduleNotificationAsync({
            content: {
            title: "Buen día 🌿 Tenés una tarea pendiente",
            body: task.title || "Tenés una tarea para hoy",
            sound: true,
            data: {
                taskId: task.id,
                taskNotificationKey: getNotificationInstanceKey(task.id, index),
                screen: "Tareas",
            },
            },
            trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: notificationDate,
            channelId: TASK_NOTIFICATION_CHANNEL_ID,
            },
        })
        );
    }

    await Promise.all(notificationsToCreate);
    }

    export async function syncTaskNotificationsForUser({ tasks = [], userId }) {
    const hasPermission = await setupTaskNotifications();

    if (!hasPermission) {
        return;
    }

    const userPendingTasks = tasks.filter((task) => {
        const isAssignedToMe = String(task?.assignedTo) === String(userId);
        const isPending = !task?.completed;

        return isAssignedToMe && isPending;
    });

    const validNotificationKeys = userPendingTasks.map((task) =>
        getNotificationKey(task.id)
    );

    const scheduledTaskNotifications = await getScheduledTaskNotifications();

    await Promise.all(
        scheduledTaskNotifications.map(async (notification) => {
        const taskNotificationKey = notification?.content?.data?.taskNotificationKey;

        const belongsToValidPendingTask = validNotificationKeys.some((validKey) =>
            String(taskNotificationKey).startsWith(validKey)
        );

        if (!belongsToValidPendingTask) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
        })
    );

    await Promise.all(userPendingTasks.map((task) => scheduleTaskNotification(task)));
}