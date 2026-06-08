//Importaciones:
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";

//JS:
const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
    return (
        <Stack.Navigator
        screenOptions={{
            headerShadowVisible: false,
            headerTitleAlign: "center",
        }}
        >
        <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
        />
        <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
        />
        </Stack.Navigator>
    );
}