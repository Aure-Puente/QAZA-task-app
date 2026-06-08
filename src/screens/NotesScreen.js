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
  IconButton,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getNoteCategoryByKey,
  NOTE_CATEGORIES,
} from "../constants/noteCategories";
import { deleteNote, getAllNotes } from "../services/noteService";

//JS:
function formatFirestoreDate(value) {
  if (!value?.seconds) return "Sin fecha";

  const date = new Date(value.seconds * 1000);

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function NotesScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState(null);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllNotes();
      setNotes(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (error) {
      console.log("LOAD NOTES ERROR:", error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredNotes = useMemo(() => {
    if (!activeCategoryFilter) return notes;

    return notes.filter(
      (note) => String(note?.categoryKey) === String(activeCategoryFilter)
    );
  }, [notes, activeCategoryFilter]);

  const selectedCategory = useMemo(() => {
    if (!activeCategoryFilter) return null;

    return getNoteCategoryByKey(activeCategoryFilter);
  }, [activeCategoryFilter]);

  const handleToggleCategoryFilter = (categoryKey) => {
    setActiveCategoryFilter((prev) => (prev === categoryKey ? null : categoryKey));
  };

  const handleAskDeleteNote = (note) => {
    if (!note?.id) return;

    setNoteToDelete(note);
    setDeleteDialogVisible(true);
  };

  const handleCloseDeleteDialog = () => {
    if (deleting) return;

    setDeleteDialogVisible(false);
    setNoteToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete?.id) return;

    try {
      setDeleting(true);

      await deleteNote(noteToDelete.id);

      setDeleteDialogVisible(false);
      setNoteToDelete(null);
      await loadNotes();
    } catch (error) {
      console.log("DELETE NOTE ERROR:", error);
    } finally {
      setDeleting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

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
              Notas
            </Text>

            <Text variant="bodyMedium" style={styles.subtitle}>
              Creá y consultá notas compartidas con todo el equipo.
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={() => navigation.navigate("Crear nota")}
            style={styles.createButton}
            contentStyle={styles.createButtonContent}
            labelStyle={styles.createButtonLabel}
            buttonColor={theme.colors.primary}
            icon="plus"
          >
            Crear nota
          </Button>

          <View style={styles.categoriesHeader}>
            <Text style={styles.categoriesTitle}>Filtrar por categoría</Text>

            <Button
              mode="text"
              compact
              onPress={() => setActiveCategoryFilter(null)}
              disabled={!activeCategoryFilter}
              textColor="#667085"
              style={[
                styles.clearFilterButton,
                !activeCategoryFilter && styles.clearFilterButtonHidden,
              ]}
              labelStyle={styles.clearFilterLabel}
            >
              Limpiar
            </Button>
          </View>

          <View style={styles.categoriesPreview}>
            {NOTE_CATEGORIES.map((category) => {
              const selected = activeCategoryFilter === category.key;

              return (
                <Pressable
                  key={category.key}
                  onPress={() => handleToggleCategoryFilter(category.key)}
                  style={({ pressed }) => [
                    styles.categoryPreviewChip,
                    {
                      backgroundColor: selected ? category.color : category.soft,
                      borderColor: selected ? category.color : category.border,
                    },
                    pressed && styles.categoryPreviewChipPressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={selected ? "check-circle" : category.icon}
                    size={13}
                    color={selected ? "#FFFFFF" : category.color}
                  />

                  <Text
                    style={[
                      styles.categoryPreviewText,
                      { color: selected ? "#FFFFFF" : category.color },
                    ]}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory
                ? `Notas de ${selectedCategory.label}`
                : "Notas creadas"}
            </Text>

            <Text style={styles.sectionSubtitle}>
              {loading
                ? "Cargando notas..."
                : `${filteredNotes.length} nota${
                    filteredNotes.length === 1 ? "" : "s"
                  } disponible${filteredNotes.length === 1 ? "" : "s"}`}
            </Text>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Cargando notas...</Text>
            </View>
          ) : filteredNotes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons
                    name="notebook-outline"
                    size={34}
                    color={theme.colors.primary}
                  />
                </View>

                <Text variant="titleLarge" style={styles.emptyTitle}>
                  {activeCategoryFilter
                    ? "No hay notas en esta categoría"
                    : "Todavía no hay notas"}
                </Text>

                <Text variant="bodyMedium" style={styles.emptyText}>
                  {activeCategoryFilter
                    ? "Probá limpiar el filtro o crear una nueva nota para esta categoría."
                    : "Creá la primera nota para empezar a organizar ideas, información o recordatorios."}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.notesList}>
              {filteredNotes.map((note) => {
                const category = getNoteCategoryByKey(note.categoryKey);

                return (
                  <Pressable
                    key={note.id}
                    onPress={() => navigation.navigate("Editar nota", { note })}
                    style={({ pressed }) => [
                      styles.notePressable,
                      pressed && styles.notePressablePressed,
                    ]}
                  >
                    <Card style={styles.noteCard}>
                      <Card.Content style={styles.noteContent}>
                        <View style={styles.noteTopRow}>
                          <View
                            style={[
                              styles.noteIconWrap,
                              {
                                backgroundColor: category.soft,
                                borderColor: category.border,
                              },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={category.icon}
                              size={20}
                              color={category.color}
                            />
                          </View>

                          <View style={styles.noteTextWrap}>
                            <Text
                              variant="titleMedium"
                              style={styles.noteTitle}
                              numberOfLines={2}
                            >
                              {note.title || "Sin título"}
                            </Text>

                            <View style={styles.noteMetaRow}>
                              <MaterialCommunityIcons
                                name="account-edit-outline"
                                size={14}
                                color="#667085"
                              />

                              <Text style={styles.noteMetaText} numberOfLines={1}>
                                {note.updatedByName ||
                                  note.createdByName ||
                                  "Usuario"}{" "}
                                · {formatFirestoreDate(note.updatedAt || note.createdAt)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.noteActions}>
                            <IconButton
                              icon="trash-can-outline"
                              size={20}
                              mode="outlined"
                              containerColor="#FFFFFF"
                              iconColor="#C62828"
                              style={styles.deleteNoteButton}
                              onPress={() => handleAskDeleteNote(note)}
                            />

                            <MaterialCommunityIcons
                              name="chevron-right"
                              size={22}
                              color="#98A2B3"
                            />
                          </View>
                        </View>

                        <View style={styles.noteFooter}>
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

                          <Text style={styles.previewText} numberOfLines={2}>
                            {note.text || "Sin contenido"}
                          </Text>
                        </View>
                      </Card.Content>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      <Portal>
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
              Eliminar nota
            </Text>

            <Text variant="bodyMedium" style={styles.deleteDialogText}>
              ¿Querés eliminar{" "}
              <Text style={styles.deleteDialogStrong}>
                {noteToDelete?.title || "esta nota"}
              </Text>
              ? Esta acción no se puede deshacer.
            </Text>

            <View style={styles.deleteDialogActions}>
              <Button
                mode="outlined"
                onPress={handleCloseDeleteDialog}
                disabled={deleting}
                style={styles.cancelDeleteButton}
                textColor="#667085"
              >
                Cancelar
              </Button>

              <Button
                mode="contained"
                onPress={handleConfirmDelete}
                loading={deleting}
                disabled={deleting}
                style={styles.confirmDeleteButton}
                buttonColor="#C62828"
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

  createButton: {
    borderRadius: 16,
    marginBottom: 14,
  },

  createButtonContent: {
    height: 50,
  },

  createButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },

  categoriesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  categoriesTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#344054",
  },

  clearFilterButton: {
    margin: 0,
    width: 74,
    alignItems: "flex-end",
  },

  clearFilterButtonHidden: {
    opacity: 0,
  },

  clearFilterLabel: {
    fontSize: 12,
    fontWeight: "700",
  },

  categoriesPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },

  categoryPreviewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  categoryPreviewChipPressed: {
    opacity: 0.85,
  },

  categoryPreviewText: {
    fontSize: 11.5,
    fontWeight: "800",
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

  notesList: {
    gap: 12,
  },

  notePressable: {
    borderRadius: 22,
  },

  notePressablePressed: {
    opacity: 0.9,
  },

  noteCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3ECD9",
    elevation: 2,
  },

  noteContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  noteTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  noteIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  noteTextWrap: {
    flex: 1,
  },

  noteTitle: {
    fontWeight: "800",
    color: "#1F2937",
    lineHeight: 23,
    marginBottom: 6,
  },

  noteMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  noteMetaText: {
    flex: 1,
    fontSize: 12.5,
    color: "#667085",
  },

  noteFooter: {
    marginTop: 12,
    gap: 10,
  },

  categoryChip: {
    alignSelf: "flex-start",
    borderWidth: 1,
  },

  categoryChipText: {
    fontWeight: "800",
    fontSize: 12,
  },

  previewText: {
    color: "#667085",
    lineHeight: 19,
    fontSize: 13.5,
  },

  noteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  deleteNoteButton: {
    margin: 0,
    borderRadius: 14,
    borderColor: "#F0C7C2",
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
    backgroundColor: "#C62828",
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