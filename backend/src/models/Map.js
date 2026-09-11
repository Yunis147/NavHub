import mongoose from 'mongoose';

const MapSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  imagePath: { type: String, required: true },
  yamlPath: { type: String, required: true },
  resolution: { type: Number, required: true },
  origin: { type: [Number], required: true }, // [x, y, yaw]
  createdAt: { type: Date, default: Date.now },
});

export const Map = mongoose.model('Map', MapSchema);
