//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Text, useTheme } from "react-native-paper";

//JS:
function getPriorityLabel(priority) {
  switch (priority) {
    case "alta":
      return "Alta";
    case "media":
      return "Media";
    case "baja":
      return "Baja";
    default:
      return "-";
  }
}

function getPriorityColor(priority) {
  switch (priority) {
    case "alta":
      return "#C62828";
    case "media":
      return "#B7791F";
    case "baja":
      return "#2E7D32";
    default:
      return "#6B7280";
  }
}

function getPrioritySoft(priority) {
  switch (priority) {
    case "alta":
      return "rgba(198,40,40,0.10)";
    case "media":
      return "rgba(183,121,31,0.12)";
    case "baja":
      return "rgba(46,125,50,0.10)";
    default:
      return "rgba(107,114,128,0.10)";
  }
}

function getStatusLabel(completed) {
  return completed ? "Hecha" : "Pendiente";
}

function getStatusColor(completed) {
  return completed ? "#2E7D32" : "#6B7280";
}

function getStatusSoft(completed) {
  return completed ? "rgba(46,125,50,0.10)" : "rgba(107,114,128,0.10)";
}

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

function formatDueDate(date) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDueDateInfo(task) {
  const dueDate = getDueDateFromTask(task);

  if (!dueDate) {
    return {
      date: null,
      label: null,
      color: "#6B7280",
      soft: "rgba(107,114,128,0.10)",
      icon: "calendar-blank-outline",
    };
  }

  const today = getStartOfDay(new Date());
  const dueDay = getStartOfDay(dueDate);
  const diffMs = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  const isCompleted = !!task?.completed;

  if (!isCompleted && diffDays < 0) {
    return {
      date: dueDate,
      label: "Vencida",
      color: "#C62828",
      soft: "rgba(198,40,40,0.10)",
      icon: "alert-circle-outline",
    };
  }

  if (!isCompleted && diffDays === 0) {
    return {
      date: dueDate,
      label: "Vence hoy",
      color: "#B7791F",
      soft: "rgba(183,121,31,0.12)",
      icon: "calendar-today",
    };
  }

  if (!isCompleted && diffDays > 0 && diffDays <= 2) {
    return {
      date: dueDate,
      label: "Próxima",
      color: "#2563EB",
      soft: "rgba(37,99,235,0.10)",
      icon: "calendar-clock",
    };
  }

  return {
    date: dueDate,
    label: "Programada",
    color: "#4E7A28",
    soft: "rgba(78,122,40,0.10)",
    icon: "calendar-check-outline",
  };
}

export default function TaskCard({
  task,
  onToggle,
  onDelete,
  onEdit,
  onDrag,
  isActive = false,
}) {
  const theme = useTheme();

  if (!task) return null;

  const isCompleted = !!task.completed;
  const showDrag = typeof onDrag === "function";
  const dueInfo = getDueDateInfo(task);
  const hasDueDate = !!dueInfo.date;

  return (
    <Card
      style={[
        styles.card,
        isCompleted && styles.cardDone,
        isActive && styles.cardActive,
      ]}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.topRow}>
          <View style={styles.titleArea}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(isCompleted) },
                ]}
              />

              <Text
                variant="titleMedium"
                style={[styles.title, isCompleted && styles.titleDone]}
                numberOfLines={2}
              >
                {task.title || "Sin título"}
              </Text>
            </View>
          </View>

          {showDrag ? (
            <Pressable
              onPressIn={onDrag}
              style={({ pressed }) => [
                styles.dragHandle,
                pressed && styles.dragHandlePressed,
              ]}
            >
              <MaterialCommunityIcons
                name="drag-horizontal"
                size={20}
                color="#6B7280"
              />
            </Pressable>
          ) : (
            <View style={styles.dragHandlePlaceholder} />
          )}
        </View>

        <View style={styles.topBadgesRow}>
          <View
            style={[
              styles.badge,
              {
                borderColor: getPrioritySoft(task.priority),
                backgroundColor: getPrioritySoft(task.priority),
              },
            ]}
          >
            <MaterialCommunityIcons
              name="flag-outline"
              size={14}
              color={getPriorityColor(task.priority)}
            />
            <Text
              style={[
                styles.badgeText,
                { color: getPriorityColor(task.priority) },
              ]}
            >
              Prioridad {getPriorityLabel(task.priority)}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              {
                borderColor: getStatusSoft(isCompleted),
                backgroundColor: getStatusSoft(isCompleted),
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isCompleted ? "check-circle-outline" : "clock-outline"}
              size={14}
              color={getStatusColor(isCompleted)}
            />
            <Text
              style={[
                styles.badgeText,
                { color: getStatusColor(isCompleted) },
              ]}
            >
              {getStatusLabel(isCompleted)}
            </Text>
          </View>
        </View>

        {hasDueDate ? (
          <View style={styles.dueDateRow}>
            <View style={styles.dueDateLeft}>
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={16}
                color="#667085"
              />
              <Text style={styles.metaText}>
                Fecha límite{" "}
                <Text style={styles.metaStrong}>
                  {formatDueDate(dueInfo.date)}
                </Text>
              </Text>
            </View>
          </View>
        ) : null}

        {!!task.description && (
          <View style={styles.descriptionBox}>
            <Text
              variant="bodyMedium"
              style={[styles.description, isCompleted && styles.descriptionDone]}
            >
              {task.description}
            </Text>
          </View>
        )}

        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons
              name="account-check-outline"
              size={16}
              color="#667085"
            />
            <Text style={styles.metaText}>
              Asignada a{" "}
              <Text style={styles.metaStrong}>
                {task.assignedToName || "Sin asignar"}
              </Text>
            </Text>
          </View>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons
              name="account-edit-outline"
              size={16}
              color="#667085"
            />
            <Text style={styles.metaText}>
              Creada por{" "}
              <Text style={styles.metaStrong}>
                {task.createdByName || "Usuario"}
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.iconActions}>
            <IconButton
              icon="pencil-outline"
              size={20}
              mode="outlined"
              containerColor="#FFFFFF"
              iconColor="#4E7A28"
              style={styles.iconActionButton}
              onPress={() => onEdit?.(task)}
            />

            <IconButton
              icon="trash-can-outline"
              size={20}
              mode="outlined"
              containerColor="#FFFFFF"
              iconColor="#C62828"
              style={[styles.iconActionButton, styles.deleteIconButton]}
              onPress={() => onDelete?.(task)}
            />
          </View>

          <Button
            mode={isCompleted ? "outlined" : "contained"}
            onPress={() => onToggle?.(task)}
            style={[
              styles.toggleButton,
              isCompleted && styles.toggleButtonDone,
            ]}
            contentStyle={styles.buttonContent}
            labelStyle={styles.toggleButtonLabel}
            buttonColor={!isCompleted ? theme.colors.primary : undefined}
            icon={isCompleted ? "restore" : "check"}
          >
            {isCompleted ? "Marcar pendiente" : "Marcar completada"}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4ECD9",
    elevation: 2,
  },

  cardContent: {
    paddingTop: 16,
    paddingBottom: 14,
  },

  cardDone: {
    backgroundColor: "#FCFDFC",
    borderColor: "#E7EEE1",
  },

  cardActive: {
    opacity: 0.98,
  },

  topRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  titleArea: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 7,
  },

  title: {
    flex: 1,
    fontWeight: "800",
    color: "#1F2937",
    lineHeight: 24,
  },

  titleDone: {
    textDecorationLine: "line-through",
    opacity: 0.65,
  },

  dragHandle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#ECEFF3",
    alignItems: "center",
    justifyContent: "center",
  },

  dragHandlePressed: {
    opacity: 0.85,
  },

  dragHandlePlaceholder: {
    width: 38,
  },

  topBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 10,
  },

  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },

  dueDateLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },

  dueBadge: {
    flexShrink: 0,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },

  badgeText: {
    fontSize: 12.5,
    fontWeight: "700",
  },

  descriptionBox: {
    backgroundColor: "#FAFBFA",
    borderWidth: 1,
    borderColor: "#EEF2E8",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
  },

  description: {
    color: "#475467",
    lineHeight: 20,
  },

  descriptionDone: {
    opacity: 0.72,
  },

  metaSection: {
    gap: 8,
    marginBottom: 14,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  metaText: {
    flex: 1,
    fontSize: 13.5,
    color: "#667085",
  },

  metaStrong: {
    fontWeight: "800",
    color: "#344054",
  },

  actionsRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  iconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  iconActionButton: {
    margin: 0,
    borderRadius: 14,
    borderColor: "#D7DFCF",
  },

  deleteIconButton: {
    borderColor: "#F0C7C2",
  },

  toggleButton: {
    flex: 1,
    borderRadius: 14,
  },

  toggleButtonDone: {
    borderColor: "#D7DFCF",
  },

  toggleButtonLabel: {
    fontWeight: "700",
  },

  buttonContent: {
    height: 46,
  },
});