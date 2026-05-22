'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function ConfiguracionAPI() {
  const [zeusToken, setZeusToken] = useState('');
  const [walletToken, setWalletToken] = useState('');
  const [walletAccountId, setWalletAccountId] = useState('');
  const [bonoPorcentaje, setBonoPorcentaje] = useState('0'); // Nuevo estado para el bono
  const [loading, setLoading] = useState(true);

  // Cargar los datos al abrir
  useEffect(() => {
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setZeusToken(data.zeusToken || '');
          setWalletToken(data.walletToken || '');
          setWalletAccountId(data.walletAccountId || '');
          setBonoPorcentaje(data.bonoPorcentaje || '0'); // Seteamos el bono guardado
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    // Validación rápida para que no pongan locuras
    if (Number(bonoPorcentaje) < 0 || Number(bonoPorcentaje) > 1000) {
      return Swal.fire('Error', 'El bono debe ser un número entre 0 y 1000', 'error');
    }

    Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });
    
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zeusToken, walletToken, walletAccountId, bonoPorcentaje })
    });

    if (res.ok) {
      Swal.fire('¡Guardado!', 'Las credenciales y el bono se actualizaron.', 'success');
    } else {
      Swal.fire('Error', 'No se pudo guardar', 'error');
    }
  };

  if (loading) return <div className="p-8 text-white">Cargando configuración...</div>;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-[32px] shadow-2xl">
          <Link href="/" className="text-blue-500 text-xs font-black uppercase mb-4 block border border-blue-500/30 px-3 py-1 w-max rounded-md hover:bg-blue-600 hover:text-white transition-all">← Volver</Link>
          <h1 className="text-2xl font-black italic uppercase mb-8">Ajustes de API y Reglas</h1>

          <div className="space-y-6">
            
            {/* 👇 NUEVA CAJA DEL BONO 👇 */}
            <div className="bg-blue-900/20 border border-blue-500/30 p-5 rounded-2xl">
              <label className="text-[10px] font-black text-blue-400 uppercase block mb-2 tracking-widest">Bono Dinámico Actual (%)</label>
              <p className="text-xs text-gray-400 mb-3">Aplica a clientes recurrentes en Autocarga. (Clientes nuevos reciben 20% fijo).</p>
              <input 
                type="number"
                min="0"
                max="1000"
                value={bonoPorcentaje} onChange={e => setBonoPorcentaje(e.target.value)}
                className="w-full bg-gray-950 border border-blue-500/50 p-4 rounded-xl text-xl font-black text-white outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 15"
              />
            </div>
            {/* 👆 ================= 👆 */}

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Zeus Bearer Token</label>
              <textarea 
                value={zeusToken} onChange={e => setZeusToken(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-xs font-mono text-gray-300 outline-none h-24"
                placeholder="Pegá el token de Zeus acá..."
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Billetera (HG Cash) - Token</label>
              <textarea 
                value={walletToken} onChange={e => setWalletToken(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-xs font-mono text-gray-300 outline-none h-24"
                placeholder="Pegá el token de la billetera acá..."
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Billetera - Account ID</label>
              <input 
                type="text"
                value={walletAccountId} onChange={e => setWalletAccountId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-xs font-mono text-gray-300 outline-none"
                placeholder="Ej: 05065c0a-6657-4d36..."
              />
            </div>

            <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black text-sm uppercase mt-4 transition-all shadow-lg shadow-blue-900/20">
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}