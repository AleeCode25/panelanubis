'use client';
import { useState } from 'react';
import Swal from 'sweetalert2';

interface Props {
  tipo: string; 
  onClose: () => void;
  onSuccess: () => void;
}

export default function CargaEspecialModal({ tipo, onClose, onSuccess }: Props) {
  const [usuarioCasino, setUsuarioCasino] = useState('');
  const [loading, setLoading] = useState(false);

  // 👇 LÓGICA DINÁMICA: Si es CANAL da 1000, sino 500
  const montoRegalo = tipo === 'CANAL' ? 1000 : 500;

  const handleConfirmar = async () => {
    setLoading(true);
    Swal.fire({
      title: 'Procesando Regalo...',
      text: 'Conectando con el servidor de Zeus',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch('/api/transferencias/especial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioCasino: usuarioCasino.trim().toLowerCase(), tipo }), // Fuerza minúscula al enviar
      });
      const data = await res.json();
      
      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: '¡Carga Especial Exitosa!',
          text: `Se acreditaron ${montoRegalo} fichas a ${usuarioCasino}`, // Muestra 1000 o 500
          timer: 2500,
          showConfirmButton: false
        });
        onSuccess();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo cargar',
          text: data.error || "Error desconocido"
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error de Red', text: 'No hay conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const config = {
    'CANAL': { color: 'text-teal-400', bg: 'bg-teal-500/20', btn: 'bg-teal-600', icon: '📢' },
    'INSTAGRAM': { color: 'text-pink-400', bg: 'bg-pink-500/20', btn: 'bg-pink-600', icon: '📸' }
  }[tipo as any] || { color: 'text-orange-400', bg: 'bg-orange-500/20', btn: 'bg-orange-600', icon: '📅' };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-xl">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-[40px] w-full max-w-sm shadow-2xl">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl ${config.bg} ${config.color}`}>{config.icon}</div>
        <h2 className="text-2xl font-black mb-1 text-white uppercase italic">Carga de {tipo}</h2>
        
        {/* 👇 Se actualiza el texto según el tipo */}
        <p className="text-gray-500 text-xs mb-6 font-bold uppercase tracking-widest">
          Se sumarán <span className="text-white">{montoRegalo} fichas</span> fijas
        </p>
        
        <div className="space-y-4">
          <input 
            type="text" 
            value={usuarioCasino} 
            onChange={e => setUsuarioCasino(e.target.value.toLowerCase())} // Filtro ant-mayúsculas visual
            className="w-full bg-gray-800 border border-gray-700 p-5 rounded-3xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" 
            placeholder="Usuario del Jugador" 
            autoFocus 
          />
          <button onClick={handleConfirmar} disabled={!usuarioCasino || loading} className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest ${config.btn} hover:opacity-80 disabled:opacity-20`}>
            {loading ? "PROCESANDO..." : "CONFIRMAR REGALO"}
          </button>
          <button onClick={onClose} className="w-full py-2 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">Cerrar</button>
        </div>
      </div>
    </div>
  );
}