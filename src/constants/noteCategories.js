//JS:
export const NOTE_CATEGORIES = [
    {
        key: "administracion",
        label: "Administración",
        color: "#C62828",
        soft: "rgba(198, 40, 40, 0.11)",
        border: "rgba(198, 40, 40, 0.22)",
        icon: "briefcase-outline",
    },
    {
        key: "comunicacion",
        label: "Comunicación",
        color: "#7C3AED",
        soft: "rgba(124, 58, 237, 0.12)",
        border: "rgba(124, 58, 237, 0.22)",
        icon: "message-text-outline",
    },
    {
        key: "produccion_qaza",
        label: "Producción QAZA",
        color: "#EA580C",
        soft: "rgba(234, 88, 12, 0.13)",
        border: "rgba(234, 88, 12, 0.26)",
        icon: "package-variant-closed",
    },
    {
        key: "produccion_estudiarq",
        label: "Producción EstudiARQ",
        color: "#CA8A04",
        soft: "rgba(202, 138, 4, 0.14)",
        border: "rgba(202, 138, 4, 0.26)",
        icon: "home-city-outline",
    },
];

export function getNoteCategoryByKey(categoryKey) {
    return (
        NOTE_CATEGORIES.find((category) => category.key === categoryKey) ||
        NOTE_CATEGORIES[0]
    );
}