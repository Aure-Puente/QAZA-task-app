//Importaciones:
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { updateTask } from "../services/taskService";
import { getAllUsers } from "../services/userService";

//JS:
function getTaskDueDate(task) {
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

function normalizeEndOfDay(date) {
  if (!date) return null;

  const safeDate = new Date(date);
  safeDate.setHours(23, 59, 59, 999);

  return Number.isNaN(safeDate.getTime()) ? null : safeDate;
}

function formatDateLabel(date) {
  if (!date) return "Fecha no seleccionada";

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
}

function getUserLabel(userItem) {
  return userItem?.name || userItem?.email || "Usuario";
}

function getInitial(name) {
  const safeName = String(name || "").trim();
  return safeName ? safeName.charAt(0).toUpperCase() : "?";
}

function normalizeTaskResponsible(item) {
  if (!item) return null;

  if (typeof item === "string") {
    return {
      uid: String(item),
      name: "Usuario",
      email: "",
    };
  }

  const uid = String(item?.uid || item?.id || item?.userId || "");
  if (!uid) return null;

  return {
    uid,
    name: item?.name || item?.nombre || item?.displayName || item?.email || "Usuario",
    email: item?.email || "",
  };
}

function getInitialSelectedUsersFromTask(task, currentUser) {
  if (Array.isArray(task?.assignedUsers) && task.assignedUsers.length > 0) {
    return task.assignedUsers.map(normalizeTaskResponsible).filter(Boolean);
  }

  if (Array.isArray(task?.assignedToUsers) && task.assignedToUsers.length > 0) {
    return task.assignedToUsers.map(normalizeTaskResponsible).filter(Boolean);
  }

  if (Array.isArray(task?.responsables) && task.responsables.length > 0) {
    return task.responsables.map(normalizeTaskResponsible).filter(Boolean);
  }

  if (task?.assignedTo) {
    return [
      {
        uid: String(task.assignedTo),
        name: task?.assignedToName || "Usuario",
        email: "",
      },
    ];
  }

  if (currentUser?.uid) {
    return [
      {
        uid: String(currentUser.uid),
        name: currentUser?.name || "Yo",
        email: currentUser?.email || "",
      },
    ];
  }

  return [];
}

export default function EditTaskScreen({ navigation, route }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const task = route?.params?.task;

  const initialDueDate = normalizeEndOfDay(getTaskDueDate(task)) || normalizeEndOfDay(new Date());
  const initialCategory = getNoteCategoryByKey(task?.categoryKey);

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [selectedUsers, setSelectedUsers] = useState(() =>
    getInitialSelectedUsersFromTask(task, user)
  );
  const [assignDialogVisible, setAssignDialogVisible] = useState(false);

  const [categoryKey, setCategoryKey] = useState(
    task?.categoryKey || initialCategory?.key || NOTE_CATEGORIES[0]?.key
  );
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const selectedCategory = getNoteCategoryByKey(categoryKey);

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

    const merged = selfUser ? [selfUser, ...normalizedDbUsers] : normalizedDbUsers;

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

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setDatePickerVisible(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selectedDate) {
      setDueDate(normalizeEndOfDay(selectedDate));
    }
  };

  const handleSave = async () => {
    if (!task?.id) {
      Alert.alert("Error", "No se encontró la tarea.");
      return;
    }

    if (!dueDate) {
      Alert.alert("Atención", "Elegí una fecha para la tarea.");
      return;
    }

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

      const category = getNoteCategoryByKey(categoryKey);
      const normalizedDate = normalizeEndOfDay(dueDate);
      const firstAssignedUser = selectedUsers[0];

      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        categoryKey,
        categoryLabel: category.label,

        // Campos viejos para compatibilidad:
        assignedTo: String(firstAssignedUser.uid),
        assignedToName: getUserLabel(firstAssignedUser),

        // Campo nuevo para múltiples responsables:
        assignedUsers: selectedUsers.map((item) => ({
          uid: String(item.uid),
          name: item.name || item.email || "Usuario",
          email: item.email || "",
        })),

        dueDate: normalizedDate.toISOString(),
        dueDateTimestamp: normalizedDate.getTime(),
        hasDueDate: true,
      });

      setSuccessVisible(true);
    } catch (error) {
      console.log("UPDATE TASK ERROR:", error);
      Alert.alert("Error", "No se pudo actualizar la tarea.");
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
        <StatusBar barStyle="dark-content" backgroundColor="#F4F8F1" />

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
                Editar tarea
              </Text>

              <Text variant="bodyMedium" style={styles.subtitle}>
                Actualizá la tarea, cambiá el día, responsables o categoría.
              </Text>
            </View>

            <Pressable
              onPress={() => setDatePickerVisible(true)}
              style={({ pressed }) => [
                styles.dateInfoCard,
                pressed && styles.dateInfoCardPressed,
              ]}
            >
              <View style={styles.dateInfoIcon}>
                <MaterialCommunityIcons
                  name="calendar-edit"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>

              <View style={styles.dateInfoTextWrap}>
                <Text style={styles.dateInfoLabel}>Tarea para el día</Text>
                <Text style={styles.dateInfoValue}>
                  {formatDateLabel(dueDate)}
                </Text>
              </View>

              <View style={styles.chevronBadge}>
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={18}
                  color="#6B7280"
                />
              </View>
            </Pressable>

            {datePickerVisible ? (
              <View style={Platform.OS === "ios" ? styles.iosDatePickerBox : null}>
                <DateTimePicker
                  value={dueDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleDateChange}
                  locale="es-AR"
                />

                {Platform.OS === "ios" ? (
                  <Button
                    mode="contained"
                    onPress={() => setDatePickerVisible(false)}
                    style={styles.iosDateButton}
                    buttonColor={theme.colors.primary}
                  >
                    Confirmar fecha
                  </Button>
                ) : null}
              </View>
            ) : null}

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
                  left={<TextInput.Icon icon="text-box-outline" />}
                  theme={{
                    colors: {
                      primary: "#4E7A28",
                      outline: "#C9D8BF",
                      background: "#FFFFFF",
                    },
                  }}
                />

                <TextInput
                  label="Descripción"
                  mode="outlined"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={5}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={[styles.inputContent, styles.textAreaContent]}
                  left={<TextInput.Icon icon="file-document-outline" />}
                  theme={{
                    colors: {
                      primary: "#4E7A28",
                      outline: "#C9D8BF",
                      background: "#FFFFFF",
                    },
                  }}
                />

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.sectionIconWrap}>
                      <MaterialCommunityIcons
                        name="shape-outline"
                        size={16}
                        color={theme.colors.primary}
                      />
                    </View>

                    <Text variant="titleSmall" style={styles.label}>
                      Categoría
                    </Text>
                  </View>

                  <Text style={styles.sectionHint}>
                    El color de la categoría se va a mostrar en el calendario.
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
                      <Text style={styles.selectorLabel}>Categoría</Text>
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
                      color="#6B7280"
                    />
                  </View>
                </Pressable>

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.sectionIconWrap}>
                      <MaterialCommunityIcons
                        name="account-multiple-check-outline"
                        size={16}
                        color={theme.colors.primary}
                      />
                    </View>

                    <Text variant="titleSmall" style={styles.label}>
                      Responsables
                    </Text>
                  </View>

                  <Text style={styles.sectionHint}>
                    Podés seleccionar una o varias personas para esta tarea.
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
                        color={theme.colors.primary}
                      />
                    </View>

                    <View style={styles.selectorTextWrap}>
                      <Text style={styles.selectorLabel}>Responsables</Text>
                      <Text style={styles.selectorValue}>
                        {selectedUsersText}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.chevronBadge}>
                    {usersLoading ? (
                      <ActivityIndicator size={16} color={theme.colors.primary} />
                    ) : (
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color="#6B7280"
                      />
                    )}
                  </View>
                </Pressable>

                {selectedUsers.length > 0 ? (
                  <View style={styles.selectedUsersWrap}>
                    {selectedUsers.map((item) => (
                      <View key={item.uid} style={styles.selectedUserChip}>
                        <View style={styles.selectedUserInitial}>
                          <Text style={styles.selectedUserInitialText}>
                            {getInitial(getUserLabel(item))}
                          </Text>
                        </View>

                        <Text style={styles.selectedUserName} numberOfLines={1}>
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
                            color="#667085"
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
                    color="#6B7280"
                  />

                  <Text style={styles.infoText}>
                    Si cambiás responsables o fecha, las notificaciones se sincronizan cuando cada usuario abra la app.
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
                  buttonColor={theme.colors.primary}
                  icon="content-save-outline"
                >
                  Guardar cambios
                </Button>

                <Button
                  mode="text"
                  onPress={() => navigation.goBack()}
                  disabled={saving}
                  textColor="#667085"
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
                        backgroundColor: isSelected ? item.soft : "#FFFFFF",
                        borderColor: isSelected ? item.border : "#ECEFF3",
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
                          name={isSelected ? "account-check-outline" : "account-outline"}
                          size={18}
                          color={theme.colors.primary}
                        />
                      </View>

                      <View style={styles.optionTextWrap}>
                        <Text style={styles.optionName}>
                          {String(item.uid) === String(user?.uid)
                            ? `${item.name || "Yo"} (Yo)`
                            : item.name || item.email || "Usuario"}
                        </Text>

                        {!!item.email ? (
                          <Text style={styles.optionEmail}>{item.email}</Text>
                        ) : null}
                      </View>

                      {isSelected ? (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color={theme.colors.primary}
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
              textColor="#667085"
              disabled={selectedUsers.length === 0}
            >
              Limpiar
            </Button>

            <Button
              mode="contained"
              onPress={() => setAssignDialogVisible(false)}
              buttonColor={theme.colors.primary}
              style={styles.assignDialogDoneButton}
              contentStyle={styles.assignDialogDoneButtonContent}
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
              <MaterialCommunityIcons name="check-bold" size={30} color="#FFFFFF" />
            </View>

            <Text variant="titleLarge" style={styles.successTitle}>
              Tarea actualizada
            </Text>

            <Text variant="bodyMedium" style={styles.successText}>
              Los cambios se guardaron correctamente.
            </Text>

            <Button
              mode="contained"
              onPress={handleCloseSuccess}
              style={styles.successButton}
              contentStyle={styles.successButtonContent}
              buttonColor={theme.colors.primary}
            >
              Continuar
            </Button>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

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

  dateInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
    elevation: 2,
  },

  dateInfoCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },

  dateInfoIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#F6F9F2",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    alignItems: "center",
    justifyContent: "center",
  },

  dateInfoTextWrap: {
    flex: 1,
  },

  dateInfoLabel: {
    fontSize: 12,
    color: "#667085",
    fontWeight: "600",
    marginBottom: 2,
  },

  dateInfoValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
    textTransform: "capitalize",
  },

  iosDatePickerBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    borderRadius: 20,
    marginBottom: 16,
    paddingBottom: 12,
    overflow: "hidden",
  },

  iosDateButton: {
    marginHorizontal: 14,
    borderRadius: 14,
  },

  card: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    elevation: 3,
  },

  cardContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
  },

  input: {
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
  },

  inputOutline: {
    borderRadius: 16,
  },

  inputContent: {
    minHeight: 54,
  },

  textAreaContent: {
    minHeight: 120,
    paddingTop: 12,
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
    backgroundColor: "#F6F9F2",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontWeight: "800",
    color: "#344054",
  },

  sectionHint: {
    fontSize: 12.5,
    color: "#667085",
    lineHeight: 18,
  },

  selectorTrigger: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C9D8BF",
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#F6F9F2",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    alignItems: "center",
    justifyContent: "center",
  },

  selectorTextWrap: {
    flex: 1,
  },

  selectorLabel: {
    fontSize: 11.5,
    color: "#667085",
    fontWeight: "600",
    marginBottom: 2,
  },

  selectorValue: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#344054",
  },

  chevronBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#ECEFF3",
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
    backgroundColor: "#F6F9F2",
    borderWidth: 1,
    borderColor: "#DDEAD1",
    borderRadius: 999,
    paddingLeft: 5,
    paddingRight: 8,
    paddingVertical: 5,
  },

  selectedUserInitial: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#4E7A28",
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
    color: "#344054",
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
    backgroundColor: "#FAFBFA",
    borderWidth: 1,
    borderColor: "#ECEFF3",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 16,
  },

  infoText: {
    flex: 1,
    fontSize: 12.5,
    color: "#667085",
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

  selectDialog: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },

  selectDialogTitle: {
    fontWeight: "800",
    color: "#1F2937",
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
    borderColor: "#ECEFF3",
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#F6F9F2",
    borderColor: "#D8E6CD",
  },

  optionAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3ECD9",
    backgroundColor: "#F6F9F2",
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
    color: "#344054",
  },

  optionEmail: {
    fontSize: 12.5,
    color: "#667085",
    marginTop: 2,
  },

  emptyDialogText: {
    color: "#667085",
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
    minWidth: 104,
  },

  assignDialogDoneButtonContent: {
    paddingHorizontal: 16,
    height: 42,
  },

  successDialog: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#4E7A28",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  successTitle: {
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },

  successText: {
    color: "#667085",
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