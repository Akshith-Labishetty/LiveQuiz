// server.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const connectDB = require("./db.js");
const User = require("./models/User.js");
const auth = require("./middleware/auth.js");
const Quiz = require("./models/Quiz.js");
const Result = require("./models/Result.js");
const Poll = require("./models/Poll.js");
const PollVote = require("./models/PollVote.js");

// Prometheus metrics and Winston logger
const { register, metricsMiddleware, metrics } = require("./config/metrics.js");
const logger = require("./config/logger.js");

const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

// RabbitMQ → Celery sender
const { sendToCelery } = require("./queue/rabbit");

// =========================
// ONLINE USERS TRACKING
// =========================
const onlineUsers = new Map(); // userId -> { name, role, lastSeen }

// Cleanup stale sessions every 60 seconds
setInterval(() => {
  const now = Date.now();
  const TIMEOUT = 5 * 60 * 1000; // 5 minutes

  for (const [userId, data] of onlineUsers.entries()) {
    if (now - data.lastSeen > TIMEOUT) {
      onlineUsers.delete(userId);
      logger.info(`Removed stale session: ${userId}`);
    }
  }
}, 60000);

const app = express();

// Prometheus metrics middleware (before other routes)
app.use(metricsMiddleware);

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Connect to MongoDB with logging
connectDB();
logger.info('MongoDB connection initiated');

const PORT = 4000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// =========================
// Redis Adapter for Socket.io
// =========================
(async () => {
  try {
    const pubClient = createClient({ url: "redis://127.0.0.1:6379" });
    const subClient = pubClient.duplicate();
    await pubClient.connect();
    await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis adapter connected");
    logger.info('Redis adapter connected successfully');
  } catch (err) {
    console.error("Failed to connect Redis adapter:", err.message);
    logger.logError(err, { context: 'Redis adapter connection' });
  }
})();

// =========================
// PROMETHEUS METRICS ENDPOINT
// =========================
app.get("/metrics", async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metricsData = await register.metrics();
    res.end(metricsData);
  } catch (err) {
    logger.logError(err, { context: 'Metrics endpoint' });
    res.status(500).end(err.message);
  }
});

// =========================
// SEED USERS
// =========================
app.post("/api/seed", async (req, res) => {
  try {
    await User.deleteMany({});

    const teacherPass = await bcrypt.hash("teacher123", 10);
    const studentPass = await bcrypt.hash("student123", 10);

    await User.create([
      { rid: "T001", name: "Teacher1", role: "teacher", password: teacherPass },
      { rid: "S001", name: "Student1", role: "student", password: studentPass },
      { rid: "S002", name: "Student2", role: "student", password: studentPass },
      { rid: "S003", name: "Student3", role: "student", password: studentPass },
      { rid: "S004", name: "Student4", role: "student", password: studentPass }
    ]);

    logger.info('Database seeded with test users');
    res.json({ message: "Seed complete" });
  } catch (err) {
    logger.logError(err, { context: 'Seed users' });
    res.status(500).json({ message: "Seeding failed", error: err.message });
  }
});

// =========================
// LOGIN
// =========================
app.post("/api/auth/login", async (req, res) => {
  const { rid, password } = req.body;
  try {
    const user = await User.findOne({ rid });
    if (!user) {
      // Track failed login attempt
      metrics.loginCounter.labels('unknown', 'failure').inc();
      logger.logLogin(rid, 'unknown', false, 'User not found');
      return res.status(400).json({ message: "Invalid ID or password" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Track failed login attempt
      metrics.loginCounter.labels(user.role, 'failure').inc();
      logger.logLogin(rid, user.role, false, 'Invalid password');
      return res.status(400).json({ message: "Invalid ID or password" });
    }

    // Track successful login
    metrics.loginCounter.labels(user.role, 'success').inc();
    logger.logLogin(rid, user.role, true);

    // Track online user
    onlineUsers.set(user._id.toString(), {
      name: user.name,
      role: user.role,
      lastSeen: Date.now()
    });

    const token = jwt.sign({ id: user._id, role: user.role }, "MY_SECRET_KEY");
    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    logger.logError(err, { context: 'Login', rid });
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// =========================
// CREATE QUIZ
// =========================
app.post("/api/quiz/create", auth, async (req, res) => {
  try {
    const { quiz, title, subject } = req.body;

    if (!quiz || !Array.isArray(quiz)) {
      return res.status(400).json({ message: "Invalid quiz format" });
    }

    await Quiz.deleteMany({});

    // Add title and subject to each question
    const quizWithMeta = quiz.map(q => ({
      ...q,
      title: title || "General Quiz",
      subject: subject || "General"
    }));

    await Quiz.insertMany(quizWithMeta);

    // Track quiz creation
    metrics.quizzesCreatedCounter.inc();
    logger.logQuizCreated(req.user?.id, quiz.length);

    io.emit("new_quiz", {
      questions: quiz,
      title: title || "General Quiz",
      subject: subject || "General"
    });

    res.json({ message: "Quiz saved & broadcast!" });
  } catch (err) {
    logger.logError(err, { context: 'Quiz creation', userId: req.user?.id });
    res.status(500).json({ message: "Quiz creation failed", error: err.message });
  }
});

// =========================
// GET QUIZ
// =========================
app.get("/api/quiz", auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find().lean();
    logger.debug('Quiz fetched', { userId: req.user?.id, count: quizzes.length });
    res.json({ quizzes });
  } catch (err) {
    logger.logError(err, { context: 'Quiz fetch', userId: req.user?.id });
    res.status(500).json({ message: "Fetch failed", error: err.message });
  }
});

// =========================
// ANALYTICS DASHBOARD (Teacher Only)
// =========================
app.get("/api/analytics", auth, async (req, res) => {
  try {
    // Authorization: Only teachers can access analytics
    if (req.user.role !== "teacher") {
      logger.warn('Unauthorized analytics access attempt', { userId: req.user.id, role: req.user.role });
      return res.status(403).json({ message: "Access denied. Teachers only." });
    }

    logger.info('Analytics data requested', { userId: req.user.id });

    // Run all analytics queries in parallel for better performance
    const [
      totalStudents,
      totalTeachers,
      totalQuizzes,
      totalAttempts,
      attemptsToday,
      activeStudents,
      mostUsedQuiz,
      attemptsPerSubject,
      dailyActiveUsers,
      attemptsOverTime
    ] = await Promise.all([
      // 1. Total Students Registered
      User.countDocuments({ role: "student" }),

      // 2. Total Teachers Registered
      User.countDocuments({ role: "teacher" }),

      // 3. Total Quizzes Created
      Quiz.countDocuments(),

      // 4. Total Quiz Attempts
      Result.countDocuments(),

      // 5. Total Submissions Today
      Result.countDocuments({
        attemptDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),

      // 6. Most Active Students (Top 5)
      Result.aggregate([
        {
          $group: {
            _id: "$studentId",
            studentName: { $first: "$studentName" },
            totalAttempts: { $sum: 1 },
            averageScore: { $avg: "$percentage" }
          }
        },
        { $sort: { totalAttempts: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            studentId: "$_id",
            studentName: 1,
            totalAttempts: 1,
            averageScore: { $round: ["$averageScore", 1] }
          }
        }
      ]),

      // 7. Most Used Quiz (Most Attempted)
      Result.aggregate([
        {
          $group: {
            _id: "$quizTitle",
            attempts: { $sum: 1 },
            averageScore: { $avg: "$percentage" }
          }
        },
        { $sort: { attempts: -1 } },
        { $limit: 1 },
        {
          $project: {
            _id: 0,
            quizTitle: "$_id",
            attempts: 1,
            averageScore: { $round: ["$averageScore", 1] }
          }
        }
      ]),

      // 8. Quiz Attempts per Subject (For Pie Chart)
      Result.aggregate([
        {
          $group: {
            _id: "$subject",
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            subject: "$_id",
            count: 1
          }
        },
        { $sort: { count: -1 } }
      ]),

      // 9. Daily Active Users (Past 7 Days) - For Bar Chart
      Result.aggregate([
        {
          $match: {
            attemptDate: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$attemptDate" }
            },
            uniqueStudents: { $addToSet: "$studentId" }
          }
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            count: { $size: "$uniqueStudents" }
          }
        },
        { $sort: { date: 1 } }
      ]),

      // 10. Quiz Attempts Over Time (Past 30 Days) - For Line Chart
      Result.aggregate([
        {
          $match: {
            attemptDate: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$attemptDate" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            count: 1
          }
        },
        { $sort: { date: 1 } }
      ])
    ]);

    // Calculate online students count
    let onlineStudentsCount = 0;
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.role === 'student') {
        onlineStudentsCount++;
      }
    }

    // Prepare response
    const analyticsData = {
      summary: {
        totalStudents,
        totalTeachers,
        totalQuizzes,
        totalAttempts,
        attemptsToday,
        onlineStudentsCount
      },
      activeStudents: activeStudents || [],
      mostUsedQuiz: mostUsedQuiz[0] || { quizTitle: "N/A", attempts: 0, averageScore: 0 },
      charts: {
        attemptsPerSubject: attemptsPerSubject || [],
        dailyActiveUsers: dailyActiveUsers || [],
        attemptsOverTime: attemptsOverTime || []
      }
    };

    logger.info('Analytics data sent successfully', { userId: req.user.id });
    res.json(analyticsData);

  } catch (err) {
    logger.logError(err, { context: 'Analytics endpoint', userId: req.user?.id });
    res.status(500).json({ message: "Failed to fetch analytics", error: err.message });
  }
});

// =========================
// POLL ROUTES
// =========================

// Create New Poll (Teacher Only)
app.post("/api/poll/create", auth, async (req, res) => {
  try {
    // Authorization: Only teachers can create polls
    if (req.user.role !== "teacher") {
      logger.warn('Unauthorized poll creation attempt', { userId: req.user.id, role: req.user.role });
      return res.status(403).json({ message: "Access denied. Teachers only." });
    }

    const { question, options } = req.body;

    // Validation
    if (!question || !options || !Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ message: "Invalid poll format. Must have question and exactly 4 options." });
    }

    // Validate all options are non-empty strings
    if (options.some(opt => !opt || typeof opt !== 'string' || opt.trim() === '')) {
      return res.status(400).json({ message: "All options must be non-empty strings." });
    }

    // Delete existing poll and all votes (only one poll allowed)
    await Poll.deleteMany({});
    await PollVote.deleteMany({});
    logger.info('Deleted old poll and votes before creating new poll', { userId: req.user.id });

    // Create new poll
    const newPoll = new Poll({
      question: question.trim(),
      options: options.map(opt => opt.trim()),
      votes: { A: 0, B: 0, C: 0, D: 0 },
      active: true
    });

    await newPoll.save();
    logger.info('New poll created', { userId: req.user.id, pollId: newPoll._id, question: newPoll.question });

    // Simple response - NO WebSocket broadcast
    res.json({ message: "Poll created successfully!", pollId: newPoll._id });
  } catch (err) {
    logger.logError(err, { context: 'Poll creation', userId: req.user?.id });
    res.status(500).json({ message: "Poll creation failed", error: err.message });
  }
});

// Get Current Active Poll (Students)
app.get("/api/poll/current", auth, async (req, res) => {
  try {
    const poll = await Poll.findOne({ active: true }).sort({ createdAt: -1 }).lean();

    if (!poll) {
      return res.status(404).json({ message: "No active poll" });
    }

    // Check if this student has already voted
    let hasVoted = false;
    if (req.user.id) {
      const existingVote = await PollVote.findOne({
        studentId: req.user.id,
        pollId: poll._id
      });
      hasVoted = !!existingVote;
    }

    res.json({
      poll: {
        pollId: poll._id,
        question: poll.question,
        options: poll.options
      },
      hasVoted
    });
  } catch (err) {
    logger.logError(err, { context: 'Get current poll', userId: req.user?.id });
    res.status(500).json({ message: "Failed to fetch poll", error: err.message });
  }
});

// Get Latest Poll with Results (Analytics - Teacher Only)
app.get("/api/poll/latest", auth, async (req, res) => {
  try {
    // Authorization: Only teachers can access poll results
    if (req.user.role !== "teacher") {
      logger.warn('Unauthorized poll results access attempt', { userId: req.user.id, role: req.user.role });
      return res.status(403).json({ message: "Access denied. Teachers only." });
    }

    const poll = await Poll.findOne().sort({ createdAt: -1 }).lean();

    if (!poll) {
      return res.status(404).json({ message: "No poll found" });
    }

    // Calculate total votes
    const totalVotes = poll.votes.A + poll.votes.B + poll.votes.C + poll.votes.D;

    res.json({
      pollId: poll._id,
      question: poll.question,
      options: poll.options,
      votes: poll.votes,
      totalVotes,
      createdAt: poll.createdAt,
      active: poll.active
    });
  } catch (err) {
    logger.logError(err, { context: 'Get latest poll', userId: req.user?.id });
    res.status(500).json({ message: "Failed to fetch poll results", error: err.message });
  }
});

// Submit Poll Vote (Students)
app.post("/api/poll/submit", auth, async (req, res) => {
  try {
    const { pollId, studentId, studentName, choice } = req.body;

    // Validation
    if (!pollId || !studentId || !choice) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!['A', 'B', 'C', 'D'].includes(choice)) {
      return res.status(400).json({ message: "Invalid choice. Must be A, B, C, or D" });
    }

    // Check if poll exists
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    // Check if student has already voted (prevent duplicates)
    const existingVote = await PollVote.findOne({
      studentId: studentId,
      pollId: pollId
    });

    if (existingVote) {
      return res.status(400).json({ message: "You have already submitted this poll." });
    }

    // Save the vote
    const newVote = new PollVote({
      studentId: studentId,
      studentName: studentName || 'Unknown',
      pollId: pollId,
      choice: choice
    });
    await newVote.save();

    // Increment vote count for the chosen option
    const voteField = `votes.${choice}`;
    await Poll.findByIdAndUpdate(
      pollId,
      { $inc: { [voteField]: 1 } },
      { new: true }
    );

    logger.info('Poll vote submitted', { studentId, pollId, choice });

    res.json({ message: "Vote submitted successfully!" });
  } catch (err) {
    // Handle duplicate vote error from unique index
    if (err.code === 11000) {
      return res.status(400).json({ message: "You have already submitted this poll." });
    }
    logger.logError(err, { context: 'Poll vote submission', userId: req.user?.id });
    res.status(500).json({ message: "Failed to submit vote", error: err.message });
  }
});

// =========================
// SOCKET.IO EVENTS
// =========================
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Track WebSocket connection
  logger.logSocketConnection(socket.id);
  // Note: Increment active users when you have role info from socket handshake
  // metrics.activeUsersGauge.labels('unknown').inc();

  // When student submits result
  socket.on("studentResult", async (data) => {
    console.log("📩 Received studentResult:", JSON.stringify(data, null, 2));

    if (!data) {
      console.error("❌ No data received in studentResult");
      return;
    }

    // Track quiz submission
    metrics.quizzesSubmittedCounter.inc();
    logger.logQuizSubmitted(
      data.studentId || 'unknown',
      data.studentName || 'unknown',
      data.score || 0,
      data.totalQuestions || 0
    );

    // 💾 Save result to database for analytics
    try {
      const resultData = {
        studentId: data.studentId || data.studentName,
        studentName: data.studentName,
        quizTitle: data.quizTitle || 'General Quiz',
        subject: data.subject || 'General',
        score: data.score,
        totalQuestions: data.total || data.totalQuestions,
        timeTaken: data.timeTaken || 0
      };

      console.log("💾 Attempting to save Result:", resultData);

      const result = new Result(resultData);
      await result.save();

      console.log("✅ Quiz result saved to database successfully");

      logger.info('Quiz result saved to database', {
        studentId: data.studentId,
        score: `${data.score}/${data.total}`
      });
    } catch (err) {
      console.error("❌ SAVE FAILED:", err.message);
      console.error("Full Error:", err);
      logger.logError(err, { context: 'Save result to DB', data });
    }

    // 1️⃣ Real-time update to teacher
    io.emit("teacherView", data);

    // 2️⃣ Send result to Celery in background (RabbitMQ)
    try {
      await sendToCelery("celery.tasks.save_result_task", data);
      console.log("Result sent to Celery worker");
      logger.info('Quiz result sent to Celery', { studentId: data.studentId });
    } catch (err) {
      console.error("Celery task send failed:", err.message);
      logger.logError(err, { context: 'Celery task send', data });
    }
  });

  // =========================
  // POLL VOTE SUBMISSION
  // =========================
  socket.on("submit-vote", async (data) => {
    console.log("🗳️ Received poll vote:", JSON.stringify(data, null, 2));

    if (!data || !data.pollId || !data.studentId || !data.choice) {
      console.error("❌ Invalid vote data received");
      socket.emit("vote-error", { message: "Invalid vote data" });
      return;
    }

    try {
      // Validate choice is A, B, C, or D
      if (!['A', 'B', 'C', 'D'].includes(data.choice)) {
        socket.emit("vote-error", { message: "Invalid choice. Must be A, B, C, or D" });
        return;
      }

      // Check if poll exists
      const poll = await Poll.findById(data.pollId);
      if (!poll) {
        socket.emit("vote-error", { message: "Poll not found or has been closed" });
        return;
      }

      // Check if student has already voted for this poll
      const existingVote = await PollVote.findOne({
        studentId: data.studentId,
        pollId: data.pollId
      });

      if (existingVote) {
        console.log(`⚠️ Student ${data.studentId} already voted for poll ${data.pollId}`);
        socket.emit("vote-error", { message: "You have already voted for this poll" });
        return;
      }

      // Save the vote record
      const newVote = new PollVote({
        studentId: data.studentId,
        studentName: data.studentName || 'Unknown',
        pollId: data.pollId,
        choice: data.choice
      });
      await newVote.save();

      // Increment vote count for the chosen option
      const voteField = `votes.${data.choice}`;
      await Poll.findByIdAndUpdate(
        data.pollId,
        { $inc: { [voteField]: 1 } },
        { new: true }
      );

      // Get updated poll with latest vote counts
      const updatedPoll = await Poll.findById(data.pollId).lean();

      console.log(`✅ Vote recorded: ${data.studentName} voted ${data.choice}`);
      logger.info('Poll vote recorded', {
        studentId: data.studentId,
        pollId: data.pollId,
        choice: data.choice
      });

      // Simple confirmation - NO WebSocket broadcast
      socket.emit("vote-success", { message: "Vote recorded successfully!" });

    } catch (err) {
      console.error("❌ Vote submission error:", err.message);
      logger.logError(err, { context: 'Poll vote submission', data });
      socket.emit("vote-error", { message: "Failed to record vote. Please try again." });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    logger.logSocketDisconnection(socket.id);
    // Note: Decrement active users when you have role info
    // metrics.activeUsersGauge.labels('unknown').dec();
  });
});

server.listen(PORT, () => {
  console.log(`Server running with WebSocket + Redis + Celery on PORT ${PORT}`);
  logger.info(`LiveQuiz server started on port ${PORT}`, {
    port: PORT,
    features: ['WebSocket', 'Redis', 'Celery', 'Prometheus', 'Logstash']
  });
  logger.info(`Prometheus metrics available at http://localhost:${PORT}/metrics`);
});
