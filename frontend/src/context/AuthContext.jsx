import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

    useEffect(() => {
        // 1. Obtener la sesión actual al cargar
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // 2. Escuchar cambios en el estado de autenticación (Login, Logout, Recovery)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);

            if (event === 'PASSWORD_RECOVERY') {
                setIsRecoveringPassword(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Registrarse con Email y Contraseña
    const signUp = async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });

        if (error) throw error;

        // Crear/Registrar el perfil en la tabla 'profiles'
        if (data?.user) {
            await fetch(`${import.meta.env.VITE_API_URL}/profiles/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: data.user.id,
                    email: data.user.email,
                    full_name: fullName,
                    role: 'user'
                })
            });
        }

        return data;
    };

    // Iniciar Sesión
    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    // 1. Enviar correo para recuperar contraseña
    const resetPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        return data;
    };

    // 2. Guardar la NUEVA contraseña (se usa desde la pantalla ResetPassword.jsx)
    const updatePassword = async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) throw error;
        return data;
    };

    // Cerrar Sesión
    const signOut = () => supabase.auth.signOut();

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signUp,
            signIn,
            signOut,
            resetPassword,
            updatePassword,
            isRecoveringPassword,
            setIsRecoveringPassword
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);