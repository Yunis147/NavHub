import mongoose from 'mongoose';

// Mongo is not needed for Phase 1 teleop; it becomes required at Phase 3 (maps).
// So connection failure is a warning, not a crash — the app still drives.
export async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/navhub';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log(`[db] connected: ${uri}`);
  } catch (err) {
    console.warn(
      `[db] NOT connected (${err.message}). Teleop works without it; ` +
        `maps/waypoints (Phase 3+) will need Mongo running at ${uri}.`,
    );
  }
}
