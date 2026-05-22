'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function AdminEstadisticas() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cajeroId, setCajeroId] = useState('todos');
  const [cajeros, setCajeros] = useState([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 👇 FILTROS MÚLTIPLES
  const [filtros, setFiltros] = useState<string[]>(['CARGAS', 'RETIROS', 'PAGOS', 'ESPECIALES']);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (status === "unauthenticated" || (session && (session.user as any).role !== "ADMIN")) {
      router.push('/');
    }
  }, [status, session]);

  useEffect(() => {
    fetch('/api/admin/users').then(res => res.json()).then(setCajeros);
    
    const hoy = new Date();
    
    // Armamos la fecha manualmente en hora LOCAL para evitar el salto a UTC+3
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    const hours = String(hoy.getHours()).padStart(2, '0');
    const minutes = String(hoy.getMinutes()).padStart(2, '0');

    // Inicio del día clavado a las 00:00
    const inicio = `${year}-${month}-${day}T00:00`;
    // Hasta este mismo instante
    const fin = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    setFrom(inicio);
    setTo(fin);
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/estadisticas?from=${from}&to=${to}&cajeroId=${cajeroId}`);
    const result = await res.json();
    setData(result);
    setFiltros(['CARGAS', 'RETIROS', 'PAGOS', 'ESPECIALES']); // Reset a todos
    setCurrentPage(1);
    setLoading(false);
  };

  const toggleFiltro = (filtro: string) => {
    setFiltros(prev => 
      prev.includes(filtro) ? prev.filter(f => f !== filtro) : [...prev, filtro]
    );
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    if (!data || data.movimientos.length === 0) return;
    const headers = ["Fecha,Cajero,Detalle,Monto Base,Bono,Total,Usuario Zeus/Titular\n"];
    const rows = data.movimientos.map((m: any) => {
      const fecha = `"${new Date(m.fechaCarga).toLocaleString('es-AR')}"`;
      const cajero = `"${m.cajeroAsignado?.nombre || 'S/D'}"`;
      const detalle = `"${m.remitente}"`;
      
      const signo = (m.remitente === "RETIRO" || m.remitente === "PAGO_BILLETERA") ? "-" : "";
      
      const base = `${signo}${m.monto || 0}`;
      const bono = m.montoBono || 0;
      const total = `${signo}${(m.monto || 0) + bono}`;
      const user = `"${m.usuarioCasino || ''}"`;
      
      return `${fecha},${cajero},${detalle},${base},${bono},${total},${user}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Caja_${from}_a_${to}.csv`);
    link.click();
  };

  // 👇 Lógica de Filtrado Múltiple
  const filteredMovimientos = data?.movimientos?.filter((m: any) => {
    const esEspecial = ['CANAL', 'INSTAGRAM', 'AGENDAMIENTO'].includes(m.remitente) || m.coelsaCode?.startsWith("ESPECIAL-");
    const esRetiro = m.remitente === 'RETIRO';
    const esPago = m.remitente === 'PAGO_BILLETERA';
    const esCarga = !esEspecial && !esRetiro && !esPago;

    return (
      (filtros.includes('CARGAS') && esCarga) ||
      (filtros.includes('RETIROS') && esRetiro) ||
      (filtros.includes('PAGOS') && esPago) ||
      (filtros.includes('ESPECIALES') && esEspecial)
    );
  }) || [];

  const totalPages = Math.ceil(filteredMovimientos.length / ITEMS_PER_PAGE) || 1;
  const paginatedMovimientos = filteredMovimientos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (status === "loading") return null;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/" className="text-blue-500 text-xs font-black uppercase mb-2 block">← Volver al Panel</Link>
            <h1 className="text-3xl font-black italic uppercase">Control de Caja</h1>
          </div>
          
          <div className="flex gap-3">
            <button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-green-900/20">
              📊 Excel
            </button>
            <button onClick={fetchStats} className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">
              {loading ? "Calculando..." : "Actualizar Datos"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-900 p-6 rounded-[32px] border border-gray-800 mb-8 shadow-2xl">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Desde</label>
            <input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Hasta</label>
            <input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2">Filtrar por Cajero</label>
            <select value={cajeroId} onChange={e => setCajeroId(e.target.value)} className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold">
              <option value="todos">Todos los cajeros</option>
              {cajeros.map((c: any) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 p-6 rounded-[24px] border border-gray-800 shadow-xl">
                <p className="text-green-400 text-[9px] font-black uppercase tracking-widest mb-1">Plata Real (Entrada)</p>
                <h3 className="text-2xl font-black text-white font-mono">${(data.resumen.totalSinBono || 0).toLocaleString()}</h3>
              </div>
              
              <div className="bg-gray-900 p-6 rounded-[24px] border border-gray-800 shadow-xl border-l-4 border-l-red-500">
                <p className="text-red-500 text-[9px] font-black uppercase tracking-widest mb-1">Pagos (Salida CBU)</p>
                <h3 className="text-2xl font-black text-red-400 font-mono">-${(data.resumen.totalPagado || 0).toLocaleString()}</h3>
              </div>

              <div className="bg-white p-6 rounded-[24px] shadow-2xl">
                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Ganancia Neta (Caja)</p>
                <h3 className="text-2xl font-black text-black font-mono">
                  ${((data.resumen.totalSinBono || 0) - (data.resumen.totalPagado || 0)).toLocaleString()}
                </h3>
              </div>

              <div className="bg-blue-600 p-6 rounded-[24px] shadow-2xl shadow-blue-900/20">
                <p className="text-blue-200 text-[9px] font-black uppercase tracking-widest mb-1">Total Zeus Entrado</p>
                <h3 className="text-2xl font-black text-white font-mono">${(data.resumen.totalEntrado || 0).toLocaleString()}</h3>
              </div>

              <div className="bg-gray-900 p-6 rounded-[24px] border border-gray-800 shadow-xl border-l-4 border-l-blue-500">
                <p className="text-blue-500 text-[9px] font-black uppercase tracking-widest mb-1">Total en Bonos</p>
                <h3 className="text-2xl font-black text-white font-mono">${(data.resumen.totalBonos || 0).toLocaleString()}</h3>
              </div>
              
              <div className="bg-gray-900 p-6 rounded-[24px] border border-gray-800 shadow-xl border-l-4 border-l-pink-500">
                <p className="text-pink-500 text-[9px] font-black uppercase tracking-widest mb-1">Regalos Manuales</p>
                <h3 className="text-2xl font-black text-white font-mono">${(data.resumen.totalEspeciales || 0).toLocaleString()}</h3>
              </div>
              
              <div className="bg-gray-900 p-6 rounded-[24px] border border-gray-800 shadow-xl border-l-4 border-l-orange-500">
                <p className="text-orange-500 text-[9px] font-black uppercase tracking-widest mb-1">Retiros Fichas (Zeus)</p>
                <h3 className="text-2xl font-black text-orange-400 font-mono">${(data.resumen.totalRetiros || 0).toLocaleString()}</h3>
              </div>
            </div>

            {/* 👇 BOTONES INTERRUPTORES (MÚLTIPLE SELECCIÓN) */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button 
                onClick={() => { setFiltros(['CARGAS', 'RETIROS', 'PAGOS', 'ESPECIALES']); setCurrentPage(1); }} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filtros.length === 4 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 bg-gray-900 border border-gray-800 hover:bg-gray-800'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => toggleFiltro('CARGAS')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filtros.includes('CARGAS') ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-gray-500 bg-gray-900 border border-gray-800 hover:bg-gray-800'}`}
              >
                Cargas
              </button>
              <button 
                onClick={() => toggleFiltro('RETIROS')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filtros.includes('RETIROS') ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30' : 'text-gray-500 bg-gray-900 border border-gray-800 hover:bg-gray-800'}`}
              >
                Retiros Fichas
              </button>
              <button 
                onClick={() => toggleFiltro('PAGOS')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filtros.includes('PAGOS') ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'text-gray-500 bg-gray-900 border border-gray-800 hover:bg-gray-800'}`}
              >
                Pagos Reales
              </button>
              <button 
                onClick={() => toggleFiltro('ESPECIALES')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filtros.includes('ESPECIALES') ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'text-gray-500 bg-gray-900 border border-gray-800 hover:bg-gray-800'}`}
              >
                Regalos
              </button>
            </div>

            <div className="bg-gray-900 rounded-[32px] border border-gray-800 overflow-hidden shadow-2xl overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-800/50 text-gray-500 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="p-5">Fecha Carga</th>
                    <th className="p-5">Cajero</th>
                    <th className="p-5">Detalle</th>
                    <th className="p-5">Monto Base</th>
                    <th className="p-5">Bono</th>
                    <th className="p-5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {paginatedMovimientos.map((m: any) => {
                    const esEspecial = ['CANAL', 'INSTAGRAM', 'AGENDAMIENTO'].includes(m.remitente) || m.coelsaCode?.startsWith("ESPECIAL-");
                    const esRetiro = m.remitente === "RETIRO";
                    const esPago = m.remitente === "PAGO_BILLETERA";
                    const esSalida = esRetiro || esPago;
                    
                    return (
                      <tr key={m._id} className="hover:bg-gray-800/20 transition-all">
                        <td className="p-5 text-[10px] font-mono text-gray-400">{new Date(m.fechaCarga).toLocaleString('es-AR')}</td>
                        <td className="p-5 font-bold text-xs">{m.cajeroAsignado?.nombre || 'S/D'}</td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold uppercase">{esPago ? 'Pago Real' : m.remitente}</p>
                            {esEspecial && <span className="bg-pink-500/20 text-pink-400 text-[8px] px-2 py-1 rounded-md font-black uppercase">Regalo</span>}
                            {esRetiro && <span className="bg-orange-500/20 text-orange-500 text-[8px] px-2 py-1 rounded-md font-black uppercase">Fichas Restadas</span>}
                            {esPago && <span className="bg-red-600/20 text-red-500 text-[8px] px-2 py-1 rounded-md font-black uppercase">Transferencia CBU</span>}
                          </div>
                          <p className="text-[10px] text-blue-400 font-mono">
                            {esPago ? `Titular: ${m.usuarioCasino}` : `ID Zeus: ${m.usuarioCasino}`}
                          </p>
                        </td>
                        <td className={`p-5 font-mono font-bold ${esRetiro ? 'text-orange-400' : esPago ? 'text-red-400' : esEspecial ? 'text-pink-400' : 'text-green-400'}`}>
                          {esSalida ? '-' : ''}${(m.monto || 0).toLocaleString()}
                        </td>
                        <td className="p-5 font-mono text-blue-400 font-bold">{m.montoBono > 0 ? `+${(m.montoBono).toLocaleString()}` : '-'}</td>
                        <td className={`p-5 font-mono font-black text-lg ${esSalida ? 'text-red-500' : 'text-white'}`}>
                           {esSalida ? '-' : ''}${((m.monto || 0) + (m.montoBono || 0)).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedMovimientos.length === 0 && (
                    <tr><td colSpan={6} className="p-10 text-center text-gray-500 italic font-bold">No hay registros para los filtros seleccionados</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredMovimientos.length > 0 && (
              <div className="flex justify-between items-center mt-6">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-3 bg-gray-900 border border-gray-800 text-gray-400 rounded-2xl text-[10px] font-black uppercase disabled:opacity-30 hover:bg-gray-800 hover:text-white transition-all shadow-lg"
                >
                  Anterior
                </button>
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                  Página {currentPage} de {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-6 py-3 bg-gray-900 border border-gray-800 text-gray-400 rounded-2xl text-[10px] font-black uppercase disabled:opacity-30 hover:bg-gray-800 hover:text-white transition-all shadow-lg"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}