'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function CierreTurnoModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [fechaInicio, setFechaInicio] = useState('');
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Por defecto le sugerimos un turno de 8 horas atrás
    const date = new Date();
    date.setHours(date.getHours() - 8);
    // Formateamos para que el input datetime-local lo entienda (YYYY-MM-DDThh:mm)
    const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setFechaInicio(iso);
  }, []);

  const handleCalcular = async () => {
    if (!fechaInicio) return;
    setLoading(true);
    
    try {
      // Mandamos la fecha exacta a la API
      const res = await fetch(`/api/cajero/cierre?desde=${new Date(fechaInicio).toISOString()}`);
      const data = await res.json();
      
      if (res.ok) {
        setDatos(data);
        setStep(2); // Pasamos al Ticket
      } else {
        Swal.fire('Error', 'No se pudieron calcular los datos', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Falla de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    // Formateamos las fechas lindo para WhatsApp
    const inicioStr = new Date(datos.desde).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
    const finStr = new Date(datos.hasta).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

    const texto = `*CIERRE DE TURNO*\n👤 Cajero: ${datos.cajero}\n⏰ Desde: ${inicioStr}\n⏰ Hasta: ${finStr}\n\n` +
                  `✅ *INGRESOS*\n` +
                  `💰 Plata Real Cargada: $${datos.totalReal.toLocaleString('es-AR')}\n` +
                  `🎁 Regalos/Extras: $${datos.totalRegalos.toLocaleString('es-AR')}\n` +
                  `📊 Total Fichas Zeus: $${(datos.totalReal + datos.totalRegalos).toLocaleString('es-AR')}\n\n` +
                  `❌ *SALIDAS*\n` +
                  `🎰 Fichas Retiradas: $${(datos.totalRetiros || 0).toLocaleString('es-AR')}\n` +
                  `💸 Pagos Enviados: $${(datos.totalPagos || 0).toLocaleString('es-AR')}\n\n` +
                  `📈 *Operaciones:* ${datos.cantidad}`;
    
    navigator.clipboard.writeText(texto);
    Swal.fire({ icon: 'success', title: 'Ticket copiado', text: 'Listo para enviar', timer: 1500, showConfirmButton: false });
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-[32px] w-full max-w-sm shadow-2xl">
        
        {step === 1 ? (
          <div className="animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">🕒</div>
            <h2 className="text-xl font-black mb-1 text-white uppercase italic text-center">Horario de Ingreso</h2>
            <p className="text-center text-gray-500 text-[10px] uppercase mb-6 tracking-widest">¿A qué hora empezaste a cargar?</p>
            
            <div className="space-y-4">
              <input 
                type="datetime-local" 
                value={fechaInicio} 
                onChange={e => setFechaInicio(e.target.value)} 
                className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
              />
              
              <div className="flex gap-2 pt-2">
                <button onClick={onClose} className="flex-1 bg-gray-800 py-4 rounded-2xl font-black text-xs uppercase text-gray-400 hover:text-white transition-all">Cancelar</button>
                <button 
                  onClick={handleCalcular} 
                  disabled={!fechaInicio || loading} 
                  className="flex-[2] bg-yellow-600 hover:bg-yellow-700 py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-lg shadow-yellow-900/30 text-yellow-50"
                >
                  {loading ? "CALCULANDO..." : "VER TICKET"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4">
            <h2 className="text-xl font-black mb-1 text-white uppercase italic text-center">Ticket de Turno</h2>
            <p className="text-center text-gray-500 text-[10px] uppercase mb-6 tracking-widest">
              De {new Date(datos.desde).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} a {new Date(datos.hasta).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
            </p>
            
            <div className="bg-gray-950 p-6 rounded-2xl mb-6 border border-gray-800 font-mono text-sm shadow-inner space-y-3">
              <p className="text-gray-500 text-[10px] border-b border-gray-800 pb-1 uppercase font-bold">Ingresos</p>
              <div className="flex justify-between">
                <span className="text-gray-400">Plata Real:</span>
                <span className="text-green-400 font-bold">${datos.totalReal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Regalos/Extras:</span>
                <span className="text-pink-400 font-bold">${datos.totalRegalos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-800">
                <span className="text-gray-300 font-bold">TOTAL ZEUS:</span>
                <span className="text-white font-black text-lg">${(datos.totalReal + datos.totalRegalos).toLocaleString()}</span>
              </div>

              <p className="text-gray-500 text-[10px] border-b border-gray-800 pb-1 mt-2 uppercase font-bold">Salidas</p>
              <div className="flex justify-between">
                <span className="text-gray-400">Retiros Fichas:</span>
                <span className="text-orange-400 font-bold">-${(datos.totalRetiros || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-800">
                <span className="text-gray-400">Pagos Enviados:</span>
                <span className="text-red-500 font-bold">-${(datos.totalPagos || 0).toLocaleString()}</span>
              </div>

              <div className="text-center pt-2 text-[10px] text-gray-600">
                Operaciones del período: {datos.cantidad}
              </div>
            </div>

            <button onClick={handleCopy} className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-black text-xs uppercase mb-3 shadow-lg shadow-green-900/30 transition-all">
              Copiar para WhatsApp
            </button>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-[1] bg-gray-800 py-3 rounded-2xl font-black text-[10px] uppercase text-gray-400 hover:text-white transition-all">Atrás</button>
              <button onClick={onClose} className="flex-[1] text-gray-500 font-bold text-[10px] uppercase py-3 hover:text-white transition-all">Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}