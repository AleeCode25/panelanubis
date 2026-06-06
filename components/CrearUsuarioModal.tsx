'use client';
import { useState } from 'react';
import Swal from 'sweetalert2';

export default function CrearUsuarioModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCrear = async () => {
    setLoading(true);
    Swal.fire({
      title: 'Creando Jugador...',
      text: 'Registrando en GanamosNet', // CAMBIO: Texto actualizado
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch('/api/casino/crear-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json();

      if (res.ok) {
        Swal.close();
        setCreated(true);
      } else {
        Swal.fire({ icon: 'error', title: 'No se pudo crear', text: data.error || "Error de validación" });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Sin conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    // CAMBIO: Link y textos ajustados para Ganamos
    const texto = `Te dejo tu nuevo usuario para GanamosNet:\n\nUsuario: ${username}\nContraseña: ${password}\n\nLink de la plataforma: https://ganamosnet.win\n\nCARGA MINIMA: $2.000\nRETIRO MINIMO: $5.000\nCARGAS & RETIROS 24HS SIN LIMITES`;
    
    navigator.clipboard.writeText(texto);
    Swal.fire({
      icon: 'success',
      title: '¡Copiado!',
      text: 'Los datos están listos para pegar en WhatsApp',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-[32px] w-full max-w-md shadow-2xl">
        {!created ? (
          <>
            <h2 className="text-2xl font-black mb-6 text-white uppercase italic">Nuevo Jugador Ganamos</h2>
            <div className="space-y-4">
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value.toLowerCase())}
                className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-white font-bold" 
                placeholder="Nombre de Usuario" 
              />
              <input 
                type="text" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-white font-bold" 
                placeholder="Contraseña" 
              />
              <div className="flex gap-3 pt-4">
                <button onClick={onClose} className="flex-1 bg-gray-800 py-4 rounded-2xl font-black text-xs uppercase">Cancelar</button>
                <button onClick={handleCrear} disabled={!username || !password || loading} className="flex-1 bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black text-xs uppercase transition-all">
                  {loading ? "PROCESANDO..." : "CREAR AHORA"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
            <h2 className="text-2xl font-black mb-2 text-white uppercase tracking-tighter">¡USUARIO LISTO!</h2>
            <p className="text-gray-400 text-sm mb-6">Jugador registrado en Ganamos con éxito.</p>
            <button onClick={handleCopy} className="w-full bg-green-600 hover:bg-green-700 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-900/40 mb-3">
              Copiar Datos para WhatsApp
            </button>
            <button onClick={onClose} className="w-full text-gray-500 font-bold text-xs uppercase py-2">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}