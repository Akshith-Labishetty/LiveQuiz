const mongoose = require("mongoose");

/**
 * Result Schema - Stores quiz submission results from students
 * This model tracks all quiz attempts for analytics and reporting
 */
const resultSchema = new mongoose.Schema({
    // Student Information
    studentId: {
        type: String,
        required: true,
        index: true  // Index for faster queries
    },
    studentName: {
        type: String,
        required: true
    },

    // Quiz Information
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
    },
    quizTitle: {
        type: String,
        default: 'General Quiz'
    },
    subject: {
        type: String,
        default: 'General',
        index: true  // Index for subject-based analytics
    },

    // Score Information
    score: {
        type: Number,
        required: true,
        min: 0
    },
    totalQuestions: {
        type: Number,
        required: true,
        min: 1
    },
    percentage: {
        type: Number,
        min: 0,
        max: 100
    },

    // Timing Information
    attemptDate: {
        type: Date,
        default: Date.now,
        index: true  // Index for time-based analytics
    },

    // Additional Metadata
    timeTaken: {  // Time taken in seconds
        type: Number,
        min: 0
    },
    attempts: {  // Number of attempts for this quiz by this student
        type: Number,
        default: 1
    }
}, {
    timestamps: true  // Adds createdAt and updatedAt automatically
});

// Index for faster analytics queries
resultSchema.index({ studentId: 1, attemptDate: -1 });
resultSchema.index({ subject: 1, attemptDate: -1 });

// Pre-save hook to calculate percentage
// Pre-save hook to calculate percentage
resultSchema.pre('save', async function () {
    if (this.score !== undefined && this.totalQuestions) {
        this.percentage = Math.round((this.score / this.totalQuestions) * 100);
    }
});

module.exports = mongoose.model("Result", resultSchema);
