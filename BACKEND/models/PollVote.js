const mongoose = require("mongoose");

/**
 * PollVote Schema - Tracks individual student votes
 * Prevents duplicate voting via compound unique index
 */
const pollVoteSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        index: true
    },

    studentName: {
        type: String,
        required: true
    },

    pollId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll',
        required: true,
        index: true
    },

    choice: {
        type: String,
        required: true,
        enum: ['A', 'B', 'C', 'D']
    },

    votedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate voting
// One student can only vote once per poll
pollVoteSchema.index({ studentId: 1, pollId: 1 }, { unique: true });

module.exports = mongoose.model("PollVote", pollVoteSchema);
