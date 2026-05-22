'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [canPay, setCanPay] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/api/admin/users/${editingId}` : '/api/admin/users';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, usuario, password, canPay }),
    });

    if (res.ok) {
      setNombre(''); setUsuario(''); setPassword(''); setCanPay(false); setEditingId(null);
      fetchUsers();
    }
  };

  const handleEdit = (u: any) => {
    setEditingId(u._id);
    setNombre(u.nombre);
    setUsuario(u.usuario);
    setPassword(''); // La clave se deja vacía si no se quiere cambiar
    setCanPay(u.canPay || false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar usuario?")) {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-500 text-xs font-black uppercase mb-4 block">← Volver</Link>
        <h1 className="text-3xl font-black mb-8 uppercase italic">Gestión de Cajeros</h1>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-3xl border border-gray-800 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Nombre Real" value={nombre} onChange={e => setNombre(e.target.value)} className="bg-gray-800 p-4 rounded-2xl outline-none" required />
          <input type="text" placeholder="Usuario de Acceso" value={usuario} onChange={e => setUsuario(e.target.value)} className="bg-gray-800 p-4 rounded-2xl outline-none" required />
          <input type="password" placeholder={editingId ? "Nueva clave (vacío para no cambiar)" : "Contraseña"} value={password} onChange={e => setPassword(e.target.value)} className="bg-gray-800 p-4 rounded-2xl outline-none" required={!editingId} />
          
          <div className="flex items-center gap-3 bg-gray-800 p-4 rounded-2xl">
            <input type="checkbox" id="canPay" checked={canPay} onChange={e => setCanPay(e.target.checked)} className="w-5 h-5 accent-blue-600" />
            <label htmlFor="canPay" className="text-xs font-black uppercase text-gray-400">Permiso para Pagos</label>
          </div>

          <button className="md:col-span-2 bg-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700">
            {editingId ? "GUARDAR CAMBIOS" : "CREAR CAJERO"}
          </button>
          {editingId && <button type="button" onClick={() => {setEditingId(null); setNombre(''); setUsuario(''); setCanPay(false);}} className="md:col-span-2 text-gray-500 text-xs font-bold uppercase">Cancelar Edición</button>}
        </form>

        {/* LISTA */}
        <div className="space-y-4">
          {users.map((u: any) => (
            <div key={u._id} className="bg-gray-900 p-6 rounded-3xl border border-gray-800 flex justify-between items-center">
              <div>
                <p className="font-black text-lg uppercase">{u.nombre}</p>
                <p className="text-xs text-gray-500 font-mono">@{u.usuario} | {u.role}</p>
                {u.canPay && <span className="text-[8px] bg-green-500/20 text-green-500 px-2 py-1 rounded-full font-black uppercase mt-2 inline-block italic">Habilitado para Pagos</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(u)} className="bg-gray-800 p-3 rounded-xl hover:bg-blue-600 transition-all text-xs font-bold">EDITAR</button>
                <button onClick={() => handleDelete(u._id)} className="bg-red-600/10 text-red-500 p-3 rounded-xl hover:bg-red-600 hover:text-white transition-all text-xs font-bold">BORRAR</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}