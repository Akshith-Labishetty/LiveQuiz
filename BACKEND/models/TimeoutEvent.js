const mongoose = require("mongoose");

/**
 * TimeoutEvent Schema - Tracks quiz submission timeouts
 * Records when a student's submission fails to reach the server within the timeout window
 */
const timeoutEventSchema = new mongoose.Schema({
    // Student Information
    studentId: {
        type: String,
        required: true,
        index: true
    },
    studentName: {
        type: String,
        required: true
    },

    // Quiz Information
    quizId: {
        type: String,
        default: null
    },
    quizTitle: {
        type: String,
        required: true,
        default: 'Unknown Quiz'
    },

    // Timeout Details
    timeoutDuration: {
        type: Number,
        required: true,
        default: 2000  // 2 seconds in milliseconds
    },

    // Timing Information
    attemptDate: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Status flag for future cleanup
    resolved: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster analytics queries
timeoutEventSchema.index({ studentId: 1, attemptDate: -1 });

module.exports = mongoose.model("TimeoutEvent", timeoutEventSchema);
