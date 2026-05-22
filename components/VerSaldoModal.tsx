'use client';
import { useState } from 'react';
import Swal from 'sweetalert2';

export default function VerSaldoModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const handleConsultar = async () => {
    setLoading(true);
    Swal.fire({
      title: 'Consultando Zeus...',
      text: 'Obteniendo saldo actual',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch(`/api/casino/balance?username=${username.trim().toLowerCase()}`);
      const data = await res.json();

      if (res.ok) {
        Swal.close();
        const saldoFormateado = parseFloat(data.balance).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setResultado({ username: data.username.toLowerCase(), balance: saldoFormateado });
      } else {
        Swal.fire({ icon: 'error', title: 'Ups...', text: data.error || 'No se pudo obtener el saldo' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Sin conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const texto = `Hola ${resultado.username} tu saldo es : $${resultado.balance}`;
    navigator.clipboard.writeText(texto);
    
    Swal.fire({
      icon: 'success',
      title: '¡Copiado!',
      text: 'Mensaje listo para WhatsApp',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-[32px] w-full max-w-sm shadow-2xl">
        {!resultado ? (
          <>
            <h2 className="text-xl font-black mb-1 text-white uppercase italic text-center">Consultar Saldo</h2>
            <p className="text-center text-gray-500 text-[10px] uppercase mb-6 tracking-widest">Ingresá el usuario del jugador</p>
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Nombre de usuario..." 
                value={username} 
                onChange={e => setUsername(e.target.value.toLowerCase())} // Fuerza minúscula
                className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 bg-gray-800 py-4 rounded-2xl font-black text-xs uppercase text-gray-400">Cerrar</button>
                <button 
                  onClick={handleConsultar} 
                  disabled={!username || loading} 
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black text-xs uppercase transition-all"
                >
                  {loading ? "..." : "VER SALDO"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">💰</div>
            <h2 className="text-xl font-black mb-6 text-white uppercase">RESULTADO</h2>
            
            <div className="bg-gray-800 p-6 rounded-2xl text-center mb-6 border border-gray-700 shadow-inner">
                <p className="text-gray-400 text-sm mb-1">Hola <span className="text-white font-bold">{resultado.username}</span></p>
                <p className="text-gray-400 text-sm">tu saldo es : <span className="text-green-400 font-black text-2xl block mt-1">${resultado.balance}</span></p>
            </div>

            <button 
              onClick={handleCopy}
              className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-black text-xs uppercase mb-3 shadow-lg shadow-green-900/20"
            >
              COPIAR PARA WHATSAPP
            </button>
            <button onClick={() => setResultado(null)} className="w-full text-blue-500 font-bold text-[10px] uppercase mb-4">Consultar otro usuario</button>
            <button onClick={onClose} className="text-gray-500 font-bold text-[10px] uppercase py-2">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}