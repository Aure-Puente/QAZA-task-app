//Importaciones:
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import SplashScreen from "../screens/SplashScreen";
import AppTabs from "./AppTabs";
import AuthNavigator from "./AuthNavigator";

//JS:
export default function RootNavigator() {
    const { user, authLoading } = useAuth();
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
        setShowSplash(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    if (authLoading || showSplash) {
        return <SplashScreen />;
    }

    return user ? <AppTabs /> : <AuthNavigator />;
}