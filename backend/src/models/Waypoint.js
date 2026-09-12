import mongoose from 'mongoose';

const waypointSchema = new mongoose.Schema({
  mapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Map', required: true },
  name: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  yaw: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// A map can have multiple waypoints, we might want names to be unique per map
waypointSchema.index({ mapId: 1, name: 1 }, { unique: true });

export const Waypoint = mongoose.model('Waypoint', waypointSchema);
