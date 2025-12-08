// poll.js - Teacher Poll Creation Logic
(function () {
    // Check authentication
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
        alert("Login first!");
        window.location.href = "index.html";
        return;
    }

    if (role !== "teacher") {
        alert("Only teachers can create polls!");
        window.location.href = "student.html";
        return;
    }

    // Handle form submission
    const form = document.getElementById("pollForm");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const question = document.getElementById("question").value.trim();
        const optionA = document.getElementById("optionA").value.trim();
        const optionB = document.getElementById("optionB").value.trim();
        const optionC = document.getElementById("optionC").value.trim();
        const optionD = document.getElementById("optionD").value.trim();

        if (!question || !optionA || !optionB || !optionC || !optionD) {
            alert("Please fill in all fields!");
            return;
        }

        const options = [optionA, optionB, optionC, optionD];

        try {
            const response = await fetch("http://localhost:4000/api/poll/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ question, options })
            });

            const result = await response.json();

            if (response.ok) {
                alert("✅ Poll created successfully!");
                window.location.href = "teacher.html";
            } else {
                alert("❌ " + result.message);
            }
        } catch (err) {
            console.error("Poll creation error:", err);
            alert("❌ Failed to create poll. Please try again.");
        }
    });

    // Back button
    window.goBack = function () {
        window.location.href = "teacher.html";
    };
})();
