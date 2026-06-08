//Importaciones:
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NoteFormScreen from "../screens/NoteFormScreen";
import NotesScreen from "../screens/NotesScreen";

//JS:
const Stack = createNativeStackNavigator();

export default function NotesStackNavigator() {
    return (
        <Stack.Navigator
        screenOptions={{
            headerShown: false,
            headerTitleAlign: "center",
            headerShadowVisible: false,
        }}
        >
        <Stack.Screen name="NotasMain" component={NotesScreen} />
        <Stack.Screen name="Crear nota" component={NoteFormScreen} />
        <Stack.Screen name="Editar nota" component={NoteFormScreen} />
        </Stack.Navigator>
    );
}