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

function formatDateShortFromTask(task) {
  const date = getDueDateFromTask(task);

  if (!date) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateLongFromTask(task) {
  const date = getDueDateFromTask(task);

  if (!date) return "Sin fecha asignada";

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getInitials(name) {
  const safeName = String(name || "").trim();

  if (!safeName) return "?";

  return safeName.charAt(0).toUpperCase();
}

export default function TaskHistoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [ownerFilter, setOwnerFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getAllTasks();
      setTasks(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (error) {
      console.log("LOAD HISTORY TASKS ERROR:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        loadTasks();
      }
    }, [user?.uid, loadTasks])
  );

  const completedTasks = useMemo(() => {
    return (tasks || [])
      .filter((task) => !!task?.completed)
      .sort((a, b) => {
        const aDate = getDueDateFromTask(a);
        const bDate = getDueDateFromTask(b);

        const aTime =
          a?.updatedAt?.seconds ||
          aDate?.getTime?.() / 1000 ||
          a?.createdAt?.seconds ||
          0;

        const bTime =
          b?.updatedAt?.seconds ||
          bDate?.getTime?.() / 1000 ||
          b?.createdAt?.seconds ||
          0;

        return bTime - aTime;
      });
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return completedTasks.filter((task) => {
      if (ownerFilter === "mine") {
        if (String(task.assignedTo) !== String(user?.uid)) return false;
      }

      if (ownerFilter === "others") {
        if (String(task.assignedTo) === String(user?.uid)) return false;
      }

      if (categoryFilter) {
        if (String(task.categoryKey) !== String(categoryFilter)) return false;
      }

      return true;
    });
  }, [completedTasks, ownerFilter, categoryFilter, user?.uid]);

  const selectedCategory = useMemo(() => {
    if (!categoryFilter) return null;

    return getNoteCategoryByKey(categoryFilter);
  }, [categoryFilter]);

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

  return (
    <>
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
              Historial
            </Text>

            <Text variant="bodyMedium" style={styles.subtitle}>
              Consultá las tareas que ya fueron completadas por el equipo.
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory
                ? `Realizadas de ${selectedCategory.label}`
                : "Tareas completadas"}
            </Text>

            <Text style={styles.sectionSubtitle}>
              {loading
                ? "Cargando historial..."
                : `${filteredTasks.length} resultado${
                    filteredTasks.length === 1 ? "" : "s"
                  } encontrado${filteredTasks.length === 1 ? "" : "s"}`}
            </Text>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Cargando historial...</Text>
            </View>
          ) : filteredTasks.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons
                    name="clipboard-text-clock-outline"
                    size={34}
                    color={theme.colors.primary}
                  />
                </View>

                <Text variant="titleLarge" style={styles.emptyTitle}>
                  No hay tareas completadas
                </Text>

                <Text variant="bodyMedium" style={styles.emptyText}>
                  Cuando una tarea se marque como completada, va a aparecer en este historial.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.tasksList}>
              {filteredTasks.map((task) => {
                const category = getNoteCategoryByKey(task.categoryKey);

                return (
                  <Card key={task.id} style={styles.taskCard}>
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
                          <Text style={styles.taskAvatarText}>
                            {getInitials(task.assignedToName)}
                          </Text>
                        </View>

                        <View style={styles.taskTitleWrap}>
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
                            color="#2E7D32"
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
                            color="#667085"
                          />

                          <Text style={styles.metaText}>
                            Responsable{" "}
                            <Text style={styles.metaStrong}>
                              {task.assignedToName || "Sin asignar"}
                            </Text>
                          </Text>
                        </View>

                        <View style={styles.metaRow}>
                          <MaterialCommunityIcons
                            name="account-edit-outline"
                            size={15}
                            color="#667085"
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
                            color="#667085"
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
              })}
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
      </Portal>
    </>
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

  filtersCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    elevation: 1,
    marginBottom: 18,
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

  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },

  loadingText: {
    marginTop: 10,
    color: "#667085",
    fontWeight: "600",
  },

  emptyCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    elevation: 2,
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
    backgroundColor: "#F6F9F2",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },

  emptyText: {
    color: "#667085",
    textAlign: "center",
    lineHeight: 21,
  },

  tasksList: {
    gap: 12,
  },

  taskCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    elevation: 2,
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
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  taskTitleWrap: {
    flex: 1,
  },

  taskTitle: {
    fontWeight: "800",
    color: "#1F2937",
    lineHeight: 23,
    marginBottom: 4,
  },

  taskDateText: {
    fontSize: 12.5,
    color: "#667085",
    textTransform: "capitalize",
  },

  doneBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#2E7D32",
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
    backgroundColor: "rgba(46,125,50,0.10)",
    borderColor: "rgba(46,125,50,0.18)",
  },

  completedChipText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#2E7D32",
  },

  taskDescription: {
    color: "#475467",
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
    color: "#667085",
  },

  metaStrong: {
    fontWeight: "800",
    color: "#344054",
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
});