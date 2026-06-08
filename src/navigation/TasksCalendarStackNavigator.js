//Importaciones:
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CalendarScreen from "../screens/CalendarScreen";
import CreateTaskScreen from "../screens/CreateTaskScreen";
import EditTaskScreen from "../screens/EditTaskScreen";

//JS:
const Stack = createNativeStackNavigator();

export default function TasksCalendarStackNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                headerTitleAlign: "center",
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen name="TareasCalendario" component={CalendarScreen} />
            <Stack.Screen name="Crear tarea" component={CreateTaskScreen} />
            <Stack.Screen name="Editar tarea" component={EditTaskScreen} />
        </Stack.Navigator>
    );
}