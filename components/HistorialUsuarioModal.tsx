'use client';
import { useState } from 'react';
import Swal from 'sweetalert2';

export default function HistorialUsuarioModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  // Nuevos estados para Paginación y Filtros
  const [filtro, setFiltro] = useState('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const handleBuscar = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cajero/historial?username=${username.trim().toLowerCase()}`);
      const data = await res.json();
      if (res.ok) {
        setMovimientos(data);
        setBuscado(true);
        setCurrentPage(1); // Reseteamos la página a 1 al buscar
        setFiltro('TODOS'); // Reseteamos el filtro
      } else {
        Swal.fire('Error', 'No se pudo obtener el historial', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Lógica de Filtrado
  const movimientosFiltrados = movimientos.filter((m) => {
    const esEspecial = ['CANAL', 'INSTAGRAM', 'AGENDAMIENTO'].includes(m.remitente) || m.coelsaCode?.startsWith("ESPECIAL-");
    const esRetiro = m.remitente === 'RETIRO' || m.remitente === 'PAGO_BILLETERA' || m.monto < 0;

    if (filtro === 'CARGAS') return !esEspecial && !esRetiro;
    if (filtro === 'RETIROS') return esRetiro;
    if (filtro === 'ESPECIALES') return esEspecial;
    return true; // 'TODOS'
  });

  // Lógica de Paginación
  const totalPages = Math.ceil(movimientosFiltrados.length / ITEMS_PER_PAGE) || 1;
  const paginatedMovimientos = movimientosFiltrados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-[32px] w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        
        <div className="text-center mb-6">
          <h2 className="text-xl font-black text-white uppercase italic">Auditoría de Jugador</h2>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest">Historial interno de cargas y retiros</p>
        </div>

        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="Usuario del casino..." 
            value={username} 
            onChange={e => setUsername(e.target.value.toLowerCase())}
            className="flex-1 bg-gray-800 border border-gray-700 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
          />
          <button 
            onClick={handleBuscar}
            disabled={loading || !username}
            className="bg-blue-600 hover:bg-blue-700 px-6 rounded-2xl font-black text-xs uppercase transition-all disabled:opacity-50"
          >
            {loading ? '...' : 'BUSCAR'}
          </button>
        </div>

        {/* Filtros */}
        {buscado && movimientos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-800 pb-4">
            <button onClick={() => { setFiltro('TODOS'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filtro === 'TODOS' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:bg-gray-800'}`}>Todos</button>
            <button onClick={() => { setFiltro('CARGAS'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filtro === 'CARGAS' ? 'bg-green-600/20 text-green-400' : 'text-gray-500 hover:bg-gray-800'}`}>Cargas Reales</button>
            <button onClick={() => { setFiltro('RETIROS'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filtro === 'RETIROS' ? 'bg-red-600/20 text-red-400' : 'text-gray-500 hover:bg-gray-800'}`}>Retiros</button>
            <button onClick={() => { setFiltro('ESPECIALES'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filtro === 'ESPECIALES' ? 'bg-pink-600/20 text-pink-400' : 'text-gray-500 hover:bg-gray-800'}`}>Regalos</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {buscado && paginatedMovimientos.length > 0 ? (
            <div className="space-y-3">
              {paginatedMovimientos.map((m) => {
                const esEspecial = ['CANAL', 'INSTAGRAM', 'AGENDAMIENTO'].includes(m.remitente) || m.coelsaCode?.startsWith("ESPECIAL-");
                const esRetiro = m.remitente === 'RETIRO' || m.remitente === 'PAGO_BILLETERA' || m.monto < 0;

                return (
                  <div key={m._id} className="bg-gray-800/40 border border-gray-800 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${esEspecial ? 'bg-pink-500/20 text-pink-400' : esRetiro ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {esRetiro ? 'RETIRO' : m.remitente}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{new Date(m.fechaCarga).toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">Cajero: <span className="text-white font-bold">{m.cajeroAsignado?.nombre || 'S/D'}</span></p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black font-mono ${esEspecial ? 'text-pink-400' : esRetiro ? 'text-orange-400' : 'text-green-400'}`}>
                        {esRetiro ? '-' : ''}${Math.abs(m.monto).toLocaleString()}
                      </p>
                      {m.montoBono > 0 && <p className="text-[10px] text-blue-400 font-bold">+${m.montoBono.toLocaleString()} Bono</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : buscado ? (
            <div className="text-center py-10 text-gray-600 font-bold italic">No hay registros para este filtro.</div>
          ) : (
            <div className="text-center py-10 text-gray-700 text-xs uppercase tracking-widest font-bold">Ingresá un usuario para ver su actividad</div>
          )}
        </div>

        {/* Paginación */}
        {buscado && movimientosFiltrados.length > 0 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-800 text-gray-400 rounded-xl text-[10px] font-black uppercase disabled:opacity-30 hover:bg-gray-700 hover:text-white transition-all"
            >
              Anterior
            </button>
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
              Página {currentPage} de {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-800 text-gray-400 rounded-xl text-[10px] font-black uppercase disabled:opacity-30 hover:bg-gray-700 hover:text-white transition-all"
            >
              Siguiente
            </button>
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full py-4 text-gray-500 border border-gray-800 rounded-2xl font-bold text-xs uppercase hover:bg-gray-800 hover:text-white transition-all">
          Cerrar Historial
        </button>
      </div>
    </div>
  );
}