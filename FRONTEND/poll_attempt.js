// poll_attempt.js - Student Poll Submission Logic
(function () {
    // Check authentication
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const userName = localStorage.getItem("name");
    const studentId = localStorage.getItem("rid");

    if (!token) {
        alert("Login first!");
        window.location.href = "index.html";
        return;
    }

    if (role !== "student") {
        alert("Only students can attempt polls!");
        window.location.href = "teacher.html";
        return;
    }

    // Get poll data from sessionStorage
    const pollDataStr = sessionStorage.getItem("currentPoll");

    // Check if already voted - use localStorage so it persists across tabs
    const voteKey = `poll_voted_${userName || studentId}`;
    const hasVoted = localStorage.getItem(voteKey) === "true";

    if (!pollDataStr) {
        alert("No poll data found. Please go back and try again.");
        window.location.href = "student.html";
        return;
    }

    const pollData = JSON.parse(pollDataStr);

    // Check if already voted
    if (hasVoted) {
        showMessage("You have already submitted this poll.", "error");
        document.getElementById("pollContent").style.display = "none";
        setTimeout(() => {
            window.location.href = "student.html";
        }, 3000);
        return;
    }

    // Display poll question
    document.getElementById("pollQuestion").textContent = pollData.question;

    // Display poll options
    const optionsContainer = document.getElementById("pollOptions");
    const optionLabels = ['A', 'B', 'C', 'D'];
    let optionsHTML = "";

    pollData.options.forEach((option, idx) => {
        optionsHTML += `
      <div class="poll-option">
        <input type="radio" name="pollChoice" value="${optionLabels[idx]}" id="option${optionLabels[idx]}">
        <label for="option${optionLabels[idx]}">
          <strong>${optionLabels[idx]}.</strong> ${option}
        </label>
      </div>
    `;
    });

    optionsContainer.innerHTML = optionsHTML;

    // Handle poll submission
    document.getElementById("submitBtn").addEventListener("click", async () => {
        const selectedRadio = document.querySelector('input[name="pollChoice"]:checked');

        if (!selectedRadio) {
            alert("Please select an option before submitting!");
            return;
        }

        const choice = selectedRadio.value;

        try {
            const response = await fetch("http://localhost:4000/api/poll/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    pollId: pollData.pollId,
                    studentId: studentId || userName,
                    studentName: userName,
                    choice: choice
                })
            });

            const result = await response.json();

            if (response.ok) {
                showMessage("Thank you! Poll submitted.", "success");
                document.getElementById("pollContent").style.display = "none";

                // Store in localStorage so it persists across all tabs
                const voteKey = `poll_voted_${userName || studentId}`;
                localStorage.setItem(voteKey, "true");

                // Redirect back after 2 seconds
                setTimeout(() => {
                    window.location.href = "student.html";
                }, 2000);
            } else {
                alert("❌ " + result.message);
            }
        } catch (err) {
            console.error("Poll submission error:", err);
            alert("❌ Failed to submit poll. Please try again.");
        }
    });

    // Show message function
    function showMessage(text, type) {
        const messageBox = document.getElementById("messageBox");
        messageBox.textContent = text;
        messageBox.className = "message-box message-" + type;
        messageBox.style.display = "block";
    }

    // Back button
    window.goBack = function () {
        window.location.href = "student.html";
    };
})();
