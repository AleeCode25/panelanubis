import mongoose from 'mongoose';

const TransferenciaSchema = new mongoose.Schema({
  transaccionId: { type: String, required: true, unique: true },
  monto: { type: Number, required: true },
  coelsaCode: { type: String, required: true },
  remitente: { type: String, required: true },
  cuit: { type: String, required: true },
  estado: { type: String, default: "PENDIENTE" }, 
  cajeroAsignado: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, 
  usuarioCasino: { type: String, default: null },
  conBono: { type: Boolean, default: false },
  montoBono: { type: Number, default: 0 },
  fechaIngreso: { type: Date, default: Date.now },
  fechaCarga: { type: Date, default: null }
}, { collection: 'transferenciahgganamos' }); // <-- ACÁ ESTÁ EL CAMBIO CLAVE

export default mongoose.models.Transferencia || mongoose.model('Transferencia', TransferenciaSchema);