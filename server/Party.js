import mongoose from 'mongoose';


const PartySchema = new mongoose.Schema({
  name: { type: String, required: true },
  joinCode: { type: String, required: true, unique: true },
  members: [{ type: String }], // Array of user IDs or names
  submissions: [{
    username: String,
    text: String,
    genText: String
  }],
  votes: { type: Map, of: Number, default: {} }, // { username: count }
  voters: [{ type: String, default: [] }], // Array of usernames who have voted
  winner: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const Party = mongoose.model('Party', PartySchema);
export default Party;
