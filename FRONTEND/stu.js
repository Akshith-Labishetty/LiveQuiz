// public/stu.js
(function () {

  // ===========================
  // AUTH & BASIC SETUP
  // ===========================
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const userName = localStorage.getItem("name") || "Student";

  document.getElementById("welcomeText").innerText = "Welcome " + userName + "!";

  if (!token) {
    alert("Login first!");
    location.href = "index.html";
    return;
  }

  if (role !== "student") {
    alert("Only students allowed!");
    location.href = "teacher.html";
    return;
  }

  const socket = io("http://localhost:4000");

  // ===========================
  // STATE
  // ===========================
  let latestQuiz = null;
  let studentAnswers = {};
  let correctAnswers = [];

  // How many questions already rendered
  let renderedCount = 0;

  // 🔥 Track whether student has submitted
  let hasSubmitted = false;

  // ⏱️ Timeout tracking
  const MIN_TIMEOUT_MS = 1000 // 10 mseconds
  let submissionTimeoutTimer = null;

  // Poll state
  let currentPoll = null;
  let hasVotedForCurrentPoll = false;

  // Restore previously saved answers
  try {
    const saved = sessionStorage.getItem("studentAnswers");
    if (saved) studentAnswers = JSON.parse(saved);
  } catch (err) { }

  // UI Elements
  const btnAttempt = document.getElementById("btn-attempt");
  const noquiz = document.getElementById("noquiz");
  const quizArea = document.getElementById("quiz-area");
  const questionsWrapper = document.getElementById("questions-wrapper");
  const resultBox = document.getElementById("resultBox");
  const btnSubmit = document.getElementById("btn-submit");

  // ===========================
  // ATTEMPT QUIZ
  // ===========================
  btnAttempt.addEventListener("click", () => {
    if (!latestQuiz || !Array.isArray(latestQuiz.questions)) {
      noquiz.style.display = "block";
      return;
    }
    noquiz.style.display = "none";
    renderQuiz();
  });

  // ===========================
  // RECEIVE LIVE QUIZ UPDATE
  // ===========================
  socket.on("new_quiz", (payload) => {
    if (!payload || !Array.isArray(payload.questions)) {
      latestQuiz = null;
      return;
    }

    latestQuiz = payload;
    correctAnswers = payload.questions.map(q => Number(q.correct) - 1);
    noquiz.style.display = "none";

    // 🔥 Allow submission again when new questions arrive
    hasSubmitted = false;

    // 🔥 Append newly added questions live
    if (quizArea.style.display === "block") {
      appendNewQuestions();
    }
  });

  // ===========================
  // ANSWER HANDLER
  // ===========================
  window.handleAnswer = function (qIdx, optIdx) {
    studentAnswers[qIdx] = Number(optIdx);
    sessionStorage.setItem("studentAnswers", JSON.stringify(studentAnswers));
  };

  // ===========================
  // FIRST RENDER OF QUIZ
  // ===========================
  function renderQuiz() {
    quizArea.style.display = "block";

    // Only clear the UI when quiz is opened the first time
    if (renderedCount === 0) {
      questionsWrapper.innerHTML = "";
      appendNewQuestions();
    }

    resultBox.innerText = "";
    btnSubmit.disabled = false;
  }

  // ===========================
  // 🔥 APPEND ONLY NEW QUESTIONS
  // ===========================
  function appendNewQuestions() {
    const questions = latestQuiz.questions || [];

    for (let idx = renderedCount; idx < questions.length; idx++) {
      const q = questions[idx];

      const card = document.createElement("div");
      card.className = "question-card";

      let optionsHTML = "";
      q.options.forEach((optText, optIdx) => {
        const checked = studentAnswers[idx] === optIdx ? "checked" : "";
        optionsHTML += `
          <label>
            <input type="radio" name="q${idx}" value="${optIdx}" ${checked}
              onchange="handleAnswer(${idx}, ${optIdx})">
            ${optText}
          </label>
        `;
      });

      card.innerHTML = `
        <div class="question-text">Q${idx + 1}) ${q.question}</div>
        <div class="options-list">${optionsHTML}</div>
      `;

      questionsWrapper.appendChild(card);
    }

    renderedCount = questions.length;
  }

  // ===========================
  // SUBMIT QUIZ  (BLOCK MULTIPLE SUBMISSIONS)
  // ===========================
  btnSubmit.addEventListener("click", () => {

    // 🔥 Stop multiple submissions
    if (hasSubmitted) {
      alert("You have already submitted! You cannot resubmit.");
      return;
    }

    if (!latestQuiz || !Array.isArray(latestQuiz.questions)) {
      alert("No active quiz to submit.");
      return;
    }

    const total = latestQuiz.questions.length;
    let score = 0;

    for (let i = 0; i < total; i++) {
      const s = Number(studentAnswers[i]);
      const c = Number(correctAnswers[i]);
      if (!isNaN(s) && !isNaN(c) && s === c) score++;
    }

    resultBox.innerText = `Your Score: ${score}/${total}`;

    // Send live result to teacher dashboard
    socket.emit("studentResult", {
      studentId: localStorage.getItem("rid") || userName,
      studentName: userName,
      quizTitle: latestQuiz.title || "General Quiz",
      subject: latestQuiz.subject || "General",
      score,
      total,
      timeTaken: 0 // We could add a timer later
    });

    // ⏱️ Start timeout timer (2 seconds)
    submissionTimeoutTimer = setTimeout(() => {
      console.warn("⚠️ Submission timeout - no acknowledgment received");

      // Emit timeout event to backend
      socket.emit("submission-timeout", {
        studentId: localStorage.getItem("rid") || userName,
        studentName: userName,
        quizId: latestQuiz.id || null,
        quizTitle: latestQuiz.title || "General Quiz"
      });

      // Show timeout message to student
      resultBox.innerHTML = `
        <div style="color: #e74c3c; padding: 15px; background: #fdecea; border-radius: 8px; margin-top: 10px;">
          <strong>⚠️ Submission Failed</strong><br>
          Your submission failed to reach the server. You have been timed out.<br>
          <small>Please check your internet connection and try refreshing the page.</small>
        </div>
      `;
    }, MIN_TIMEOUT_MS);

    // 🔥 Mark submission completed
    hasSubmitted = true;
  });

  // =========================
  // SUBMISSION ACKNOWLEDGMENT
  // =========================
  socket.on("submission-ack", (data) => {
    console.log("✅ Submission acknowledged:", data);

    // Clear timeout timer since we received acknowledgment
    if (submissionTimeoutTimer) {
      clearTimeout(submissionTimeoutTimer);
      submissionTimeoutTimer = null;
    }

    // Show success message if not already showing score
    if (data.success && !resultBox.innerText.includes("Your Score:")) {
      // Keep the existing score display
      // resultBox already has the score from the submission handler
    }
  });

  // =========================
  // POLL FUNCTIONALITY
  // =========================

  // Listen for new polls from teacher
  socket.on("poll-question", (pollData) => {
    console.log("📊 Received new poll:", pollData);

    if (!pollData || !pollData.question || !pollData.options) {
      return;
    }

    // Store poll data
    currentPoll = pollData;
    hasVotedForCurrentPoll = false;

    // Clear any previous vote confirmation
    document.getElementById("vote-confirmation").style.display = "none";

    // Render poll
    renderPoll(pollData);
  });

  // Render poll UI
  function renderPoll(pollData) {
    const pollArea = document.getElementById("poll-area");
    const pollQuestion = document.getElementById("poll-question");
    const pollOptions = document.getElementById("poll-options");
    const submitBtn = document.getElementById("btn-submit-vote");

    // Display question
    pollQuestion.innerText = pollData.question;

    // Create option radio buttons
    const labels = ['A', 'B', 'C', 'D'];
    let optionsHTML = "";

    pollData.options.forEach((option, idx) => {
      optionsHTML += `
        <label style="display: block; margin: 10px 0; cursor: pointer; padding: 10px; background: rgba(102, 126, 234, 0.05); border-radius: 6px;">
          <input type="radio" name="pollChoice" value="${labels[idx]}" style="margin-right: 10px;">
          <strong>${labels[idx]}.</strong> ${option}
        </label>
      `;
    });

    pollOptions.innerHTML = optionsHTML;

    // Show poll area and enable submit button
    pollArea.style.display = "block";
    submitBtn.disabled = false;
  }

  // Submit vote
  document.getElementById("btn-submit-vote").addEventListener("click", () => {
    if (hasVotedForCurrentPoll) {
      alert("You have already voted for this poll!");
      return;
    }

    if (!currentPoll) {
      alert("No active poll to vote on.");
      return;
    }

    // Get selected choice
    const selectedRadio = document.querySelector('input[name="pollChoice"]:checked');
    if (!selectedRadio) {
      alert("Please select an option before submitting!");
      return;
    }

    const choice = selectedRadio.value;
    const studentId = localStorage.getItem("rid") || userName;

    // Send vote via WebSocket
    socket.emit("submit-vote", {
      pollId: currentPoll.pollId,
      studentId: studentId,
      studentName: userName,
      choice: choice
    });

    console.log("🗳️ Vote submitted:", choice);
  });

  // Listen for vote success
  socket.on("vote-success", (data) => {
    console.log("✅ Vote confirmed:", data);

    hasVotedForCurrentPoll = true;

    // Show confirmation message
    document.getElementById("vote-confirmation").style.display = "block";

    // Disable submit button
    document.getElementById("btn-submit-vote").disabled = true;

    // Disable all radio buttons
    document.querySelectorAll('input[name="pollChoice"]').forEach(radio => {
      radio.disabled = true;
    });
  });

  // Listen for vote errors
  socket.on("vote-error", (data) => {
    console.error("❌ Vote error:", data);
    alert("Error: " + data.message);

    if (data.message.includes("already voted")) {
      hasVotedForCurrentPoll = true;
      document.getElementById("vote-confirmation").innerText = "⚠️ You have already voted";
      document.getElementById("vote-confirmation").style.display = "block";
      document.getElementById("btn-submit-vote").disabled = true;
    }
  });

  // ===========================
  // NAVIGATION
  // ===========================
  window.logout = function () {
    localStorage.clear();
    location.href = "index.html";
  };

  window.goBack = function () {
    history.back();
  };

})();
