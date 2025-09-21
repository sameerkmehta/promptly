// MongoDB connection setup using mongoose
import mongoose from 'mongoose';

// Connect to MongoDB but do not crash the whole server if unavailable.
// This keeps the HTTP API available even when the database is down; DB-backed
// endpoints will still error when used, but the server won't exit at startup.
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/promptly';
  try {
    // Avoid deprecated option warnings for older mongoose versions
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
    return true;
  } catch (err) {
    console.error('MongoDB connection error (will continue without DB):', err && (err.stack || err.message) || err);
    // Do NOT exit the process. Return false so callers can detect status if desired.
    return false;
  }
};

// Helper to inspect current mongoose connection state (0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting)
export function dbConnectionState() {
  try {
    return mongoose.connection && typeof mongoose.connection.readyState === 'number'
      ? mongoose.connection.readyState
      : 0;
  } catch (e) {
    return 0;
  }
}

export default connectDB;
