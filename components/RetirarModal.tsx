'use client';
import { useState } from 'react';
import Swal from 'sweetalert2';

export default function RetirarModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [amountToWithdraw, setAmountToWithdraw] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConsultar = async () => {
    setLoading(true);
    Swal.fire({ title: 'Buscando jugador...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch(`/api/casino/balance?username=${username.trim().toLowerCase()}`);
      const data = await res.json();
      if (res.ok) {
        Swal.close();
        setBalance(parseFloat(data.balance));
        setStep(2); 
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Usuario no encontrado' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo conectar al servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleRetirar = async () => {
    const monto = parseFloat(amountToWithdraw);

    if (monto > (balance || 0)) {
      return Swal.fire({ icon: 'warning', title: 'Saldo Insuficiente', text: 'Intentas retirar más de lo disponible.' });
    }

    setLoading(true);
    Swal.fire({ title: 'Procesando retiro...', text: `Extrayendo $${monto} de ${username}`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch('/api/casino/retirar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), amount: monto })
      });
      const data = await res.json();

      if (res.ok) {
        const nuevoSaldoFinal = (balance || 0) - monto;

        Swal.fire({
          icon: 'success',
          title: '¡Retiro Exitoso!',
          html: `
            <p style="color: #6b7280; margin-bottom: 15px;">Se extrajeron <b>$${monto.toLocaleString('es-AR')}</b> de la cuenta.</p>
            <div style="background: #1f2937; padding: 15px; border-radius: 15px; border: 1px solid #374151;">
              <span style="color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Nuevo Saldo Disponible</span><br/>
              <strong style="color: #4ade80; font-size: 28px; font-family: monospace;">$${nuevoSaldoFinal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          `,
          confirmButtonColor: '#dc2626',
          confirmButtonText: 'Entendido'
        }).then(() => onClose());
      } else {
        Swal.fire({ icon: 'error', title: 'Zeus rechazó', text: data.error });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-[32px] w-full max-w-sm shadow-2xl">
        {step === 1 ? (
          <>
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">💸</div>
            <h2 className="text-xl font-black mb-1 text-white uppercase italic text-center">Retirar Fichas</h2>
            <p className="text-center text-gray-500 text-[10px] uppercase mb-6 tracking-widest">Paso 1: Buscar Jugador</p>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Usuario de Zeus..." 
                value={username} 
                onChange={e => setUsername(e.target.value.toLowerCase())} // Fuerza minúscula
                className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-red-500 text-center" 
                autoFocus 
              />
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 bg-gray-800 py-4 rounded-2xl font-black text-xs uppercase text-gray-400">Cerrar</button>
                <button onClick={handleConsultar} disabled={!username || loading} className="flex-[2] bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-black text-xs uppercase transition-all">
                  {loading ? "BUSCANDO..." : "VER SALDO"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-black mb-6 text-white uppercase text-center italic">Confirmar Retiro</h2>
            <div className="bg-gray-800 p-6 rounded-2xl text-center mb-6 border border-gray-700">
                <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Usuario</p>
                <p className="text-white font-black text-lg mb-4">{username}</p>
                <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-1">Saldo Disponible</p>
                <p className="text-green-400 font-mono font-black text-3xl">${balance?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Monto a retirar ($)</label>
                <input type="number" placeholder="Ej: 5000" value={amountToWithdraw} onChange={e => setAmountToWithdraw(e.target.value)} className="w-full bg-gray-950 border border-gray-700 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-red-500 text-center text-xl" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 bg-gray-800 py-4 rounded-2xl font-black text-xs uppercase text-gray-400">Atrás</button>
                <button onClick={handleRetirar} disabled={!amountToWithdraw || loading} className="flex-[2] bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-lg shadow-red-900/30">
                  {loading ? "PROCESANDO..." : "RETIRAR AHORA"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}