import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword({ onSuccess }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const { updatePassword, user } = useAuth();

    useEffect(() => {
        // Si no hay una sesión activa al cargar el modal, el enlace de recuperación probablemente ya expiró o es inválido
        if (!user) {
            setErrorMsg('⚠️ El enlace de recuperación ha expirado, es inválido o ya fue utilizado. Por favor, solicita uno nuevo.');
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        // Validación local de coincidencia
        if (newPassword !== confirmPassword) {
            setErrorMsg('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);

        try {
            await updatePassword(newPassword);
            setSuccessMsg('🎉 ¡Contraseña actualizada con éxito!');

            // Redirige suavemente tras 2 segundos cerrando el modal
            setTimeout(() => {
                if (onSuccess) onSuccess();
            }, 2000);
        } catch (err) {
            console.error("Error al actualizar la contraseña:", err);
            if (err.message && (err.message.toLowerCase().includes('expired') || err.message.toLowerCase().includes('jwt'))) {
                setErrorMsg('Tu sesión de recuperación ha expirado. Por favor, solicita un nuevo enlace desde la pantalla de ingreso.');
            } else if (err.status === 401 || err.status === 400) {
                setErrorMsg('Error de autorización. Solicita un nuevo correo de restablecimiento.');
            } else {
                setErrorMsg(err.message || 'Error al actualizar la contraseña.');
            }
        } finally {
            setLoading(false);
        }
    };

    const isFormDisabled = loading || !user || errorMsg.includes('expirado') || errorMsg.includes('inválido');

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 relative">
                <button
                    onClick={() => onSuccess && onSuccess()}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors font-bold"
                    title="Cerrar modal"
                >
                    ✕
                </button>

                <h2 className="text-2xl font-bold text-emerald-400 text-center">
                    Establecer Nueva Contraseña
                </h2>
                <p className="text-xs text-slate-400 text-center">
                    Ingresa la nueva clave que deseas usar para ingresar a tu cuenta.
                </p>

                {errorMsg && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg text-center">
                        {errorMsg}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-sm p-3 rounded-lg text-center">
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">
                            Nueva Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            disabled={isFormDisabled}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">
                            Confirmar Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            disabled={isFormDisabled}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isFormDisabled}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Guardando...' : 'Actualizar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
}