import mongoose from 'mongoose';

const UserGanamosSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  usuario: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'CAJERO'], default: 'CAJERO' },
  canPay: { type: Boolean, default: false },
}, { timestamps: true });

// El tercer argumento ('users_ganamos') fuerza a Mongoose a crear/usar esa colección específica,
// separándola de la colección 'users' que usaba Zeus.
export default mongoose.models.UserGanamos || mongoose.model('UserGanamos', UserGanamosSchema, 'users_ganamos');