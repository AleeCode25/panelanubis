// app/login/page.tsx
'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn('credentials', {
      usuario: username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Credenciales inválidas');
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-blue-500">HG Panel</h1>
        <p className="text-gray-400 text-center mb-8">Gestión de Cargas HG Cash</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Usuario</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Tu usuario..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center animate-pulse">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-95"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}