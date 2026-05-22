'use client';
import { useState } from 'react';
import Swal from 'sweetalert2';

export default function ResetPasswordModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('');
  // 👇 Empezamos con la clave por defecto ya escrita
  const [password, setPassword] = useState('12345678'); 
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    const claveFinal = password.trim() || '12345678'; // Si lo borran, forzamos 12345678 por las dudas

    setLoading(true);
    Swal.fire({
      title: 'Cambiando clave...',
      text: `Se establecerá ${claveFinal} como nueva contraseña`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch('/api/casino/reset-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim().toLowerCase(),
          password: claveFinal // 👈 Mandamos la clave elegida al backend
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.close();
        setSuccess(true);
      } else {
        Swal.fire({ icon: 'error', title: 'No se pudo resetear', text: data.error });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Revisá tu conexión a internet' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const claveFinal = password.trim() || '12345678';
    const texto = `Te dejo tu usuario y contraseña :\n\nUsuario : ${username.toLowerCase()}\nContraseña : ${claveFinal}\n\nLink de la plataforma: https://casinozeus.tech \n\nCARGA MINIMA: $2.000\nRETIRO MINIMO: $5.000\nCARGAS & RETIROS 24HS SIN LIMITES`;
    
    navigator.clipboard.writeText(texto);
    Swal.fire({
      icon: 'success',
      title: '¡Copiado!',
      text: 'Listo para enviar por mensaje',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-[32px] w-full max-w-sm shadow-2xl">
        {!success ? (
          <>
            <h2 className="text-xl font-black mb-1 text-white uppercase italic text-center">Restablecer Clave</h2>
            <p className="text-center text-gray-500 text-[10px] uppercase mb-6 tracking-widest">Ingresá usuario y la nueva clave</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Usuario Zeus</label>
                <input 
                  type="text" 
                  placeholder="Ej: juanperez123" 
                  value={username} 
                  onChange={e => setUsername(e.target.value.toLowerCase())} 
                  className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-orange-500" 
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Nueva Contraseña</label>
                <input 
                  type="text" 
                  placeholder="Ej: 12345678" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-orange-500" 
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={onClose} className="flex-1 bg-gray-800 py-4 rounded-2xl font-black text-xs uppercase text-gray-400">Cerrar</button>
                <button onClick={handleReset} disabled={!username || !password || loading} className="flex-[2] bg-orange-600 hover:bg-orange-700 py-4 rounded-2xl font-black text-xs uppercase transition-all">
                  {loading ? "..." : "RESTABLECER CLAVE"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
            <h2 className="text-xl font-black mb-6 text-white uppercase">¡CLAVE CAMBIADA!</h2>
            <button onClick={handleCopy} className="w-full bg-green-600 hover:bg-green-700 py-5 rounded-2xl font-black text-xs uppercase mb-3 shadow-lg shadow-green-900/30">
              COPIAR PARA WHATSAPP
            </button>
            <button onClick={onClose} className="text-gray-500 font-bold text-[10px] uppercase py-2">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}