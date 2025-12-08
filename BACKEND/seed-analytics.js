// seed-analytics.js
// Helper script to populate sample analytics data for testing

const mongoose = require("mongoose");
const Result = require("./models/Result");

// MongoDB URI
const MONGO_URI = "mongodb://127.0.0.1:27017/livequiz";

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB Connected");
        seedAnalyticsData();
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Failed:", err.message);
        process.exit(1);
    });

// Sample subjects and quiz titles
const subjects = ["Math", "Science", "History", "English", "Geography"];
const quizTitles = {
    "Math": ["Algebra Quiz", "Geometry Quiz", "Calculus Quiz"],
    "Science": ["Physics Quiz", "Chemistry Quiz", "Biology Quiz"],
    "History": ["World War II Quiz", "Ancient Rome Quiz", "Medieval Europe Quiz"],
    "English": ["Grammar Quiz", "Literature Quiz", "Vocabulary Quiz"],
    "Geography": ["World Capitals Quiz", "Rivers Quiz", "Mountains Quiz"]
};

const students = [
    { id: "S001", name: "Student1" },
    { id: "S002", name: "Student2" },
    { id: "S003", name: "Student3" },
    { id: "S004", name: "Student4" }
];

// Generate random date within last N days
function randomDate(daysAgo) {
    const now = new Date();
    const pastDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    const randomTime = pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
    return new Date(randomTime);
}

// Generate random score
function randomScore(totalQuestions) {
    return Math.floor(Math.random() * (totalQuestions + 1));
}

// Seed analytics data
async function seedAnalyticsData() {
    try {
        // Clear existing results
        await Result.deleteMany({});
        console.log("🗑️  Cleared existing results");

        const results = [];

        // Generate 50 random quiz attempts over the past 30 days
        for (let i = 0; i < 50; i++) {
            const student = students[Math.floor(Math.random() * students.length)];
            const subject = subjects[Math.floor(Math.random() * subjects.length)];
            const quizOptions = quizTitles[subject];
            const quizTitle = quizOptions[Math.floor(Math.random() * quizOptions.length)];
            const totalQuestions = 10;
            const score = randomScore(totalQuestions);
            const timeTaken = 60 + Math.floor(Math.random() * 240); // 60-300 seconds
            const attemptDate = randomDate(30); // Within last 30 days

            results.push({
                studentId: student.id,
                studentName: student.name,
                quizTitle: quizTitle,
                subject: subject,
                score: score,
                totalQuestions: totalQuestions,
                timeTaken: timeTaken,
                attemptDate: attemptDate
            });
        }

        // Add some recent attempts (for "today" stats)
        for (let i = 0; i < 5; i++) {
            const student = students[Math.floor(Math.random() * students.length)];
            const subject = subjects[Math.floor(Math.random() * subjects.length)];
            const quizOptions = quizTitles[subject];
            const quizTitle = quizOptions[Math.floor(Math.random() * quizOptions.length)];
            const totalQuestions = 10;
            const score = randomScore(totalQuestions);
            const timeTaken = 60 + Math.floor(Math.random() * 240);
            const attemptDate = new Date(); // Today

            results.push({
                studentId: student.id,
                studentName: student.name,
                quizTitle: quizTitle,
                subject: subject,
                score: score,
                totalQuestions: totalQuestions,
                timeTaken: timeTaken,
                attemptDate: attemptDate
            });
        }

        // Insert all results
        await Result.insertMany(results);
        console.log(`✅ Inserted ${results.length} sample quiz results`);

        // Display summary
        const totalResults = await Result.countDocuments();
        const todayCount = await Result.countDocuments({
            attemptDate: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
        });

        console.log("\n📊 Sample Data Summary:");
        console.log(`   Total Results: ${totalResults}`);
        console.log(`   Today's Results: ${todayCount}`);
        console.log(`   Subjects: ${subjects.join(", ")}`);
        console.log(`   Students: ${students.length}`);

        console.log("\n✅ Analytics data seeded successfully!");
        console.log("👉 Now you can test the analytics dashboard at analytics.html\n");

        process.exit(0);

    } catch (err) {
        console.error("❌ Error seeding analytics data:", err.message);
        process.exit(1);
    }
}
