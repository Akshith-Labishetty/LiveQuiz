const mongoose = require("mongoose");
const Result = require("./models/Result");
const User = require("./models/User");
const Quiz = require("./models/Quiz");

const MONGO_URI = "mongodb://127.0.0.1:27017/livequiz";

async function debugDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const resultCount = await Result.countDocuments();
        console.log(`\n📊 Total Results in DB: ${resultCount}`);

        if (resultCount === 0) {
            console.log("⚠️ No results found! Inserting a sample result for testing...");

            const sampleResult = new Result({
                studentId: "S001",
                studentName: "Debug Student",
                quizTitle: "Debug Quiz",
                subject: "Debugging",
                score: 8,
                totalQuestions: 10,
                percentage: 80,
                timeTaken: 120,
                attemptDate: new Date()
            });

            await sampleResult.save();
            console.log("✅ Sample result inserted!");
        } else {
            const results = await Result.find().sort({ createdAt: -1 }).limit(5);
            console.log("\n📝 Last 5 Results:");
            results.forEach(r => {
                console.log(JSON.stringify(r.toObject(), null, 2));
            });
        }

        const quizCount = await Quiz.countDocuments();
        console.log(`\n📚 Total Quizzes in DB: ${quizCount}`);

        if (quizCount > 0) {
            const quizzes = await Quiz.find().limit(1);
            console.log("\n📝 Sample Quiz Question:");
            console.log(JSON.stringify(quizzes[0].toObject(), null, 2));
        }

        const userCount = await User.countDocuments();
        console.log(`\n👥 Total Users: ${userCount}`);

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Disconnected");
    }
}

debugDB();
