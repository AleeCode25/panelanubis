'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface Props {
  transfer: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CargarModal({ transfer, onClose, onSuccess }: Props) {
  const [usuarioCasino, setUsuarioCasino] = useState('');
  const [conBono, setConBono] = useState(false);
  const [tipoBono, setTipoBono] = useState<'monto' | 'porcentaje'>('porcentaje');
  const [valorBono, setValorBono] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const liberar = () => fetch(`/api/transferencias/${transfer._id}/liberar`, { method: 'POST', keepalive: true });
    window.addEventListener('beforeunload', liberar);
    return () => window.removeEventListener('beforeunload', liberar);
  }, [transfer._id]);

  const bonoCalculado = conBono ? (tipoBono === 'porcentaje' ? (transfer.monto * (parseFloat(valorBono) || 0)) / 100 : (parseFloat(valorBono) || 0)) : 0;
  const totalFinal = transfer.monto + bonoCalculado;

  const handleConfirmar = async () => {
    setLoading(true);
    
    Swal.fire({
      title: 'Acreditando fichas...',
      text: `Enviando $${totalFinal.toLocaleString()} a Ganamos`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch(`/api/transferencias/${transfer._id}/cargar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          usuarioCasino: usuarioCasino.trim().toLowerCase(),
          conBono, 
          tipoBono,
          valorBono: Number(valorBono),
          montoBase: Number(transfer.monto),
          totalFinal: Number(totalFinal)
        }),
      });
      
      const data = await res.json();

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: '¡Acreditado!',
          text: `Usuario: ${usuarioCasino.toLowerCase()} | Total: $${totalFinal.toLocaleString()}`,
          timer: 2000,
          showConfirmButton: false
        });
        onSuccess();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error en Ganamos',
          text: data.error || "No se pudo acreditar el monto total."
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Sin conexión', text: 'Error al contactar al panel.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-[32px] w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-black mb-1 text-white italic uppercase text-center">Finalizar Carga</h2>
        <div className="bg-gray-800/50 p-4 rounded-2xl mb-6 border border-gray-800 flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-500 uppercase">Total a Cargar:</span>
            <span className="text-2xl font-black text-green-400 font-mono">${totalFinal.toLocaleString()}</span>
        </div>

        <div className="space-y-4">
          <input 
            type="text" 
            value={usuarioCasino} 
            onChange={e => setUsuarioCasino(e.target.value.toLowerCase())}
            placeholder="Usuario Ganamos" 
            className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" 
          />
          <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-800">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <input type="checkbox" id="bono" checked={conBono} onChange={e => setConBono(e.target.checked)} className="w-5 h-5 accent-blue-600"/>
                    <label htmlFor="bono" className="text-xs font-black text-gray-300 uppercase">¿Bono?</label>
                </div>
                {conBono && (
                    <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-700">
                        <button onClick={() => setTipoBono('porcentaje')} className={`px-3 py-1 rounded-lg text-[10px] font-black ${tipoBono === 'porcentaje' ? 'bg-blue-600' : 'text-gray-500'}`}>%</button>
                        <button onClick={() => setTipoBono('monto')} className={`px-3 py-1 rounded-lg text-[10px] font-black ${tipoBono === 'monto' ? 'bg-blue-600' : 'text-gray-500'}`}>$</button>
                    </div>
                )}
            </div>
            {conBono && <input type="number" value={valorBono} onChange={e => setValorBono(e.target.value)} placeholder={tipoBono === 'porcentaje' ? "% Extra" : "Monto Extra"} className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl text-white font-bold"/>}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 bg-gray-800 py-4 rounded-2xl font-black text-xs uppercase text-gray-400">Cancelar</button>
            <button onClick={handleConfirmar} disabled={!usuarioCasino || loading} className="flex-[2] bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-black text-xs uppercase disabled:opacity-20 transition-all">
              {loading ? "CARGANDO..." : "CONFIRMAR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}