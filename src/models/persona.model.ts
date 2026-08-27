import mongoose from 'mongoose';

const personaSchema = new mongoose.Schema({
    personaId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Persona = mongoose.model('Persona', personaSchema);

export default Persona;