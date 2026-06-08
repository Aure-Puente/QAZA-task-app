//Importaciones:
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase/firebase";
import { loginUser, logoutUser, registerUser } from "../services/authService";

//JS:
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (userDoc.exists()) {
            setUser(userDoc.data());
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.log("Error onAuthStateChanged:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async ({ email, password }) => {
    setAuthLoading(true);
    try {
      const userData = await loginUser({ email, password });
      setUser(userData);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async ({ name, email, password }) => {
    setAuthLoading(true);
    try {
      const userData = await registerUser({ name, email, password });
      setUser(userData);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      await logoutUser();
      setUser(null);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    } finally {
      setAuthLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      authLoading,
      login,
      register,
      logout,
    }),
    [user, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}