import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    // Extraemos resetPassword (o resetPasswordForEmail) de tu AuthContext
    const { signIn, signUp, resetPassword } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (isRegister) {
                await signUp(email, password, fullName);
                alert('¡Registro exitoso! Revisa tu correo o inicia sesión.');
            } else {
                await signIn(email, password);
            }
            onClose();
        } catch (err) {
            setErrorMsg(err.message || 'Error al autenticar');
        } finally {
            setLoading(false);
        }
    };

    // Función para manejar el olvido de contraseña
    const handleForgotPassword = async () => {
        if (!email) {
            setErrorMsg('Por favor, ingresa tu correo electrónico en el campo superior.');
            return;
        }

        setErrorMsg('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (resetPassword) {
                await resetPassword(email);
            } else {
                throw new Error('La función de restablecimiento no está definida en el AuthContext.');
            }
            setSuccessMsg('📬 Correo enviado. Revisa tu bandeja de entrada para restablecer la contraseña.');
        } catch (err) {
            setErrorMsg(err.message || 'Error al solicitar el cambio de contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-bold mb-4 text-emerald-400 text-center">
                    {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
                </h2>

                {/* Mensaje de Error */}
                {errorMsg && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg mb-4 text-center">
                        {errorMsg}
                    </div>
                )}

                {/* Mensaje de Éxito */}
                {successMsg && (
                    <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-sm p-3 rounded-lg mb-4 text-center">
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-300">Nombre Completo</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {/* Botón ¿Olvidaste tu contraseña? (Solo visible en Login) */}
                    {!isRegister && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={loading}
                                className="text-xs text-emerald-400 hover:underline focus:outline-none"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg transition-all"
                    >
                        {loading ? 'Procesando...' : isRegister ? 'Registrarse' : 'Entrar'}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-slate-400">
                    {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
                    <button
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setErrorMsg('');
                            setSuccessMsg('');
                        }}
                        className="ml-2 text-emerald-400 hover:underline font-semibold"
                    >
                        {isRegister ? 'Inicia Sesión' : 'Regístrate aquí'}
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="mt-4 w-full text-xs text-slate-500 hover:text-slate-300 text-center"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}