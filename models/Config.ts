import mongoose from "mongoose";

const ConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  expiresAt: { type: Date, required: false }, // Nuevo: Para el vencimiento de la cookie
  updatedAt: { type: Date, default: Date.now }
});

// Middleware para actualizar la fecha de modificación automáticamente
// En models/Config.ts

// Middleware para actualizar la fecha de modificación automáticamente
ConfigSchema.pre('save', function() {
  this.updatedAt = new Date();
});
export default mongoose.models.Config || mongoose.model("Config", ConfigSchema);