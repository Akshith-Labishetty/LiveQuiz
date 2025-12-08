// config/metrics.js
// Prometheus metrics configuration for LiveQuiz application

const client = require('prom-client');

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({
    register,
    prefix: 'livequiz_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// ========================================
// CUSTOM BUSINESS METRICS
// ========================================

/**
 * Counter: Total number of login attempts
 * Labels: role (teacher/student), status (success/failure)
 */
const loginCounter = new client.Counter({
    name: 'livequiz_logins_total',
    help: 'Total number of login attempts',
    labelNames: ['role', 'status'],
    registers: [register]
});

/**
 * Counter: Total number of quizzes created
 */
const quizzesCreatedCounter = new client.Counter({
    name: 'livequiz_quizzes_created_total',
    help: 'Total number of quizzes created by teachers',
    registers: [register]
});

/**
 * Counter: Total number of quiz submissions by students
 */
const quizzesSubmittedCounter = new client.Counter({
    name: 'livequiz_quizzes_submitted_total',
    help: 'Total number of quiz submissions by students',
    registers: [register]
});

/**
 * Gauge: Current number of active users (WebSocket connections)
 * Labels: role (teacher/student)
 */
const activeUsersGauge = new client.Gauge({
    name: 'livequiz_active_users',
    help: 'Current number of active WebSocket connections',
    labelNames: ['role'],
    registers: [register]
});

// ========================================
// HTTP REQUEST METRICS
// ========================================

/**
 * Histogram: HTTP request duration in seconds
 * Labels: method, route, status
 */
const httpRequestDuration = new client.Histogram({
    name: 'livequiz_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5],
    registers: [register]
});

/**
 * Counter: Total number of HTTP requests
 * Labels: method, route, status
 */
const httpRequestCounter = new client.Counter({
    name: 'livequiz_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register]
});

// ========================================
// MIDDLEWARE FOR AUTOMATIC REQUEST TRACKING
// ========================================

/**
 * Express middleware to automatically track HTTP request metrics
 * Measures duration and counts requests for all routes
 */
function metricsMiddleware(req, res, next) {
    const start = Date.now();

    // Track response finish to measure total duration
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000; // Convert to seconds
        const route = req.route ? req.route.path : req.path;
        const method = req.method;
        const status = res.statusCode;

        // Normalize route to avoid high cardinality
        // Replace dynamic segments with placeholders
        const normalizedRoute = route
            .replace(/\/[0-9a-fA-F]{24}/g, '/:id')  // MongoDB ObjectIds
            .replace(/\/\d+/g, '/:id');              // Numeric IDs

        // Record metrics
        httpRequestDuration.labels(method, normalizedRoute, status).observe(duration);
        httpRequestCounter.labels(method, normalizedRoute, status).inc();
    });

    next();
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    register,
    metricsMiddleware,

    // Export individual metrics for use in application code
    metrics: {
        loginCounter,
        quizzesCreatedCounter,
        quizzesSubmittedCounter,
        activeUsersGauge,
        httpRequestDuration,
        httpRequestCounter
    }
};
