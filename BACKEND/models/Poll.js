const mongoose = require("mongoose");

/**
 * Poll Schema - Stores poll questions and vote counts
 * Only one poll can be active at a time
 */
const pollSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },

    options: {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return v.length === 4;
            },
            message: 'Poll must have exactly 4 options (A, B, C, D)'
        }
    },

    votes: {
        A: { type: Number, default: 0, min: 0 },
        B: { type: Number, default: 0, min: 0 },
        C: { type: Number, default: 0, min: 0 },
        D: { type: Number, default: 0, min: 0 }
    },

    active: {
        type: Boolean,
        default: true
    },

    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Index for finding active poll quickly
pollSchema.index({ active: 1, createdAt: -1 });

module.exports = mongoose.model("Poll", pollSchema);
