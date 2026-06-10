//JS:
export const NOTE_CATEGORIES = [
    {
        key: "administracion",
        label: "Administración",

        color: "#C62828",
        soft: "rgba(198, 40, 40, 0.11)",
        border: "rgba(198, 40, 40, 0.22)",

        darkColor: "#FF8A80",
        darkSoft: "rgba(255, 138, 128, 0.14)",
        darkBorder: "rgba(255, 138, 128, 0.34)",

        onColor: "#FFFFFF",
        darkOnColor: "#4A0905",

        icon: "briefcase-outline",
    },
    {
        key: "comunicacion",
        label: "Comunicación",

        color: "#7C3AED",
        soft: "rgba(124, 58, 237, 0.12)",
        border: "rgba(124, 58, 237, 0.22)",

        darkColor: "#C4B5FD",
        darkSoft: "rgba(196, 181, 253, 0.14)",
        darkBorder: "rgba(196, 181, 253, 0.34)",

        onColor: "#FFFFFF",
        darkOnColor: "#2E1065",

        icon: "message-text-outline",
    },
    {
        key: "produccion_qaza",
        label: "Producción QAZA",

        color: "#EA580C",
        soft: "rgba(234, 88, 12, 0.13)",
        border: "rgba(234, 88, 12, 0.26)",

        darkColor: "#FDBA74",
        darkSoft: "rgba(253, 186, 116, 0.15)",
        darkBorder: "rgba(253, 186, 116, 0.36)",

        onColor: "#FFFFFF",
        darkOnColor: "#431407",

        icon: "package-variant-closed",
    },
    {
        key: "produccion_estudiarq",
        label: "Producción EstudiARQ",

        color: "#CA8A04",
        soft: "rgba(202, 138, 4, 0.14)",
        border: "rgba(202, 138, 4, 0.26)",

        darkColor: "#FDE68A",
        darkSoft: "rgba(253, 230, 138, 0.15)",
        darkBorder: "rgba(253, 230, 138, 0.34)",

        onColor: "#FFFFFF",
        darkOnColor: "#422006",

        icon: "home-city-outline",
    },
];

export function getNoteCategoryByKey(categoryKey, isDarkMode = false) {
    const category =
        NOTE_CATEGORIES.find((item) => item.key === categoryKey) ||
        NOTE_CATEGORIES[0];

    if (!isDarkMode) {
        return {
            ...category,
            textOnColor: category.onColor || "#FFFFFF",
        };
    }

    return {
        ...category,
        color: category.darkColor || category.color,
        soft: category.darkSoft || category.soft,
        border: category.darkBorder || category.border,
        textOnColor: category.darkOnColor || category.onColor || "#FFFFFF",
    };
}