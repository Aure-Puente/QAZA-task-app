//Importaciones:
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CalendarScreen from "../screens/CalendarScreen";
import CreateTaskScreen from "../screens/CreateTaskScreen";
import CreateWeeklyObjectiveScreen from "../screens/CreateWeeklyObjectiveScreen";
import EditTaskScreen from "../screens/EditTaskScreen";
import EditWeeklyObjectiveScreen from "../screens/EditWeeklyObjectiveScreen";

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
            <Stack.Screen
                name="Crear objetivo semanal"
                component={CreateWeeklyObjectiveScreen}
            />
            <Stack.Screen name="Editar tarea" component={EditTaskScreen} />
            <Stack.Screen
                name="Editar objetivo semanal"
                component={EditWeeklyObjectiveScreen}
            />
        </Stack.Navigator>
    );
}