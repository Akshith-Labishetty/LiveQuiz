const io = require("socket.io-client");

const socket = io("http://localhost:4000");

socket.on("connect", () => {
    console.log("✅ Connected to server");

    const payload = {
        studentId: "S001",
        studentName: "Test Student",
        quizTitle: "Debug Quiz",
        subject: "Debugging",
        score: 5,
        total: 5,
        timeTaken: 120
    };

    console.log("📤 Sending studentResult:", payload);
    socket.emit("studentResult", payload);

    // Wait a bit then disconnect
    setTimeout(() => {
        console.log("🔌 Disconnecting...");
        socket.disconnect();
    }, 2000);
});

socket.on("disconnect", () => {
    console.log("❌ Disconnected");
});
