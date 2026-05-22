import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  usuario: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'CAJERO'], default: 'CAJERO' },
  canPay: { type: Boolean, default: false }, // Importante el default
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);