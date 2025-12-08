// config/logger.js
// Winston logger configuration for structured JSON logging

const winston = require('winston');
const path = require('path');

// ========================================
// LOG FORMAT CONFIGURATION
// ========================================

// Custom format for structured JSON logs
const jsonFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Include stack traces for errors
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    winston.format.json()
);

// Custom format for console output (more readable)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;

        // Add metadata if present
        const metadataKeys = Object.keys(metadata);
        if (metadataKeys.length > 0) {
            // Filter out empty metadata objects
            const filteredMetadata = {};
            metadataKeys.forEach(key => {
                if (metadata[key] && Object.keys(metadata[key]).length > 0) {
                    filteredMetadata[key] = metadata[key];
                }
            });

            if (Object.keys(filteredMetadata).length > 0) {
                msg += ` ${JSON.stringify(filteredMetadata)}`;
            }
        }

        return msg;
    })
);

// ========================================
// LOGGER INSTANCE
// ========================================

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: 'livequiz-backend' },
    transports: [
        // File transport for all logs (JSON format for Logstash)
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/app.log'),
            format: jsonFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            tailable: true
        }),

        // Separate file for errors only
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            format: jsonFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            tailable: true
        }),

        // Console transport for development (human-readable)
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

// ========================================
// HELPER FUNCTIONS FOR STRUCTURED LOGGING
// ========================================

/**
 * Log user login attempt
 * @param {string} rid - User registration ID
 * @param {string} role - User role (teacher/student)
 * @param {boolean} success - Whether login was successful
 * @param {string} [error] - Error message if login failed
 */
logger.logLogin = function (rid, role, success, error = null) {
    const logData = {
        event: 'user_login',
        rid,
        role,
        success,
        ip: null // Can be added from req.ip
    };

    if (success) {
        logger.info('User login successful', logData);
    } else {
        logData.error = error;
        logger.warn('User login failed', logData);
    }
};

/**
 * Log quiz creation
 * @param {string} teacherId - Teacher user ID
 * @param {number} questionCount - Number of questions in quiz
 */
logger.logQuizCreated = function (teacherId, questionCount) {
    logger.info('Quiz created', {
        event: 'quiz_created',
        teacherId,
        questionCount
    });
};

/**
 * Log quiz update
 * @param {string} teacherId - Teacher user ID
 * @param {number} questionCount - Number of questions in quiz
 */
logger.logQuizUpdated = function (teacherId, questionCount) {
    logger.info('Quiz updated', {
        event: 'quiz_updated',
        teacherId,
        questionCount
    });
};

/**
 * Log quiz deletion
 * @param {string} teacherId - Teacher user ID
 */
logger.logQuizDeleted = function (teacherId) {
    logger.info('Quiz deleted', {
        event: 'quiz_deleted',
        teacherId
    });
};

/**
 * Log student quiz submission
 * @param {string} studentId - Student user ID
 * @param {string} studentName - Student name
 * @param {number} score - Quiz score
 * @param {number} totalQuestions - Total number of questions
 */
logger.logQuizSubmitted = function (studentId, studentName, score, totalQuestions) {
    logger.info('Quiz submitted', {
        event: 'quiz_submitted',
        studentId,
        studentName,
        score,
        totalQuestions,
        percentage: ((score / totalQuestions) * 100).toFixed(2)
    });
};

/**
 * Log WebSocket connection
 * @param {string} socketId - Socket connection ID
 * @param {string} [userId] - User ID if authenticated
 */
logger.logSocketConnection = function (socketId, userId = null) {
    logger.info('WebSocket connection established', {
        event: 'socket_connected',
        socketId,
        userId
    });
};

/**
 * Log WebSocket disconnection
 * @param {string} socketId - Socket connection ID
 */
logger.logSocketDisconnection = function (socketId) {
    logger.info('WebSocket connection closed', {
        event: 'socket_disconnected',
        socketId
    });
};

/**
 * Log application errors with full context
 * @param {Error} error - Error object
 * @param {object} context - Additional context (req, userId, etc.)
 */
logger.logError = function (error, context = {}) {
    logger.error('Application error', {
        event: 'error',
        errorMessage: error.message,
        errorStack: error.stack,
        ...context
    });
};

/**
 * Log database operations
 * @param {string} operation - Operation type (create, read, update, delete)
 * @param {string} collection - Database collection name
 * @param {boolean} success - Whether operation was successful
 * @param {string} [error] - Error message if operation failed
 */
logger.logDatabaseOperation = function (operation, collection, success, error = null) {
    const logData = {
        event: 'database_operation',
        operation,
        collection,
        success
    };

    if (success) {
        logger.debug('Database operation successful', logData);
    } else {
        logData.error = error;
        logger.error('Database operation failed', logData);
    }
};

// ========================================
// EXPORT
// ========================================

module.exports = logger;
