// analytics.js - Analytics Dashboard JavaScript
// Handles data fetching, chart rendering, and authentication

// ========================================
// AUTHENTICATION & AUTHORIZATION
// ========================================

const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const userName = localStorage.getItem("name");

// Check authentication
if (!token) {
    alert("Please login first!");
    window.location.href = "index.html";
}

// Check authorization - Only teachers allowed
if (role !== "teacher") {
    alert(`Access Denied: This page is only accessible to teachers. (Current role: ${role})`);
    window.location.href = role === "student" ? "student.html" : "index.html";
}

// Update welcome message
if (userName) {
    document.getElementById("welcomeText").textContent = `Welcome, ${userName}!`;
}

// ========================================
// GLOBAL VARIABLES
// ========================================

const API_BASE_URL = "http://localhost:4000";
let charts = {}; // Store chart instances for updates

// ========================================
// DATA FETCHING
// ========================================

/**
 * Fetch analytics data from backend
 */
async function fetchAnalyticsData() {
    try {
        showLoading(true);
        hideError();

        const response = await fetch(`${API_BASE_URL}/api/analytics`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Session expired. Please login again.");
            } else if (response.status === 403) {
                throw new Error("Access denied. Teachers only.");
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        }

        const data = await response.json();
        console.log("Analytics data received:", data);

        // Populate dashboard with data
        populateDashboard(data);

        showLoading(false);
        showContent(true);

    } catch (error) {
        console.error("Error fetching analytics:", error);
        showError(error.message);
        showLoading(false);
    }
}

/**
 * Populate dashboard with analytics data
 */
function populateDashboard(data) {
    // Summary Statistics
    document.getElementById("totalStudents").textContent = data.summary.totalStudents || 0;
    document.getElementById("totalTeachers").textContent = data.summary.totalTeachers || 0;
    document.getElementById("totalQuizzes").textContent = data.summary.totalQuizzes || 0;
    document.getElementById("totalAttempts").textContent = data.summary.totalAttempts || 0;
    document.getElementById("attemptsToday").textContent = data.summary.attemptsToday || 0;
    document.getElementById("onlineStudents").textContent = data.summary.onlineStudentsCount || 0;

    // Most Active Students Table
    populateActiveStudentsTable(data.activeStudents);

    // Most Used Quiz
    populateMostUsedQuiz(data.mostUsedQuiz);

    // Timeouted Students Table
    populateTimeoutedStudentsTable(data.timeoutedStudents);

    // Render Charts
    renderSubjectChart(data.charts.attemptsPerSubject);
    renderDailyUsersChart(data.charts.dailyActiveUsers);
    renderAttemptsTimeChart(data.charts.attemptsOverTime);
}

/**
 * Fetch and display latest poll results
 */
async function fetchPollResults() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/poll/latest`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.status === 404) {
            // No poll exists
            showNoPollMessage();
            return;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch poll: ${response.status}`);
        }

        const pollData = await response.json();
        console.log("Poll data received:", pollData);

        renderPollResults(pollData);

    } catch (error) {
        console.error("Error fetching poll results:", error);
        showNoPollMessage();
    }
}

/**
 * Show "No Poll" message
 */
function showNoPollMessage() {
    document.getElementById("noPollMessage").style.display = "block";
    document.getElementById("pollContent").style.display = "none";
}

/**
 * Render poll results table and chart
 */
function renderPollResults(pollData) {
    // Hide "no poll" message
    document.getElementById("noPollMessage").style.display = "none";
    document.getElementById("pollContent").style.display = "block";

    // Display question
    document.getElementById("pollQuestionTitle").textContent = pollData.question;

    // Build results table
    const tbody = document.getElementById("pollResultsTable");
    const labels = ['A', 'B', 'C', 'D'];
    const totalVotes = pollData.totalVotes || 0;

    let tableHTML = "";
    labels.forEach((label, idx) => {
        const count = pollData.votes[label] || 0;
        const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : 0;

        tableHTML += `
            <tr>
                <td><strong>${label}. ${pollData.options[idx]}</strong></td>
                <td>${count}</td>
                <td>${percentage}%</td>
            </tr>
        `;
    });

    tbody.innerHTML = tableHTML;

    // Render chart
    renderPollChart(pollData);
}

/**
 * Render poll results bar chart
 */
function renderPollChart(pollData) {
    const ctx = document.getElementById("pollChart").getContext("2d");

    // Destroy existing chart if it exists
    if (charts.pollChart) {
        charts.pollChart.destroy();
    }

    const labels = pollData.options;
    const optionLabels = ['A', 'B', 'C', 'D'];
    const values = optionLabels.map(label => pollData.votes[label] || 0);

    charts.pollChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map((opt, idx) => `${optionLabels[idx]}. ${opt}`),
            datasets: [{
                label: 'Votes',
                data: values,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.7)',
                    'rgba(118, 75, 162, 0.7)',
                    'rgba(80, 200, 120, 0.7)',
                    'rgba(255, 157, 77, 0.7)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75, 162, 1)',
                    'rgba(80, 200, 120, 1)',
                    'rgba(255, 157, 77, 1)'
                ],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: 'Number of Votes'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Options'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
                            return `Votes: ${context.parsed.y} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Populate top 5 active students table
 */
function populateActiveStudentsTable(students) {
    const tbody = document.getElementById("activeStudentsTable");

    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No student activity yet</td></tr>';
        return;
    }

    tbody.innerHTML = students.map((student, index) => {
        const rank = index + 1;
        const performanceBadge = getPerformanceBadge(student.averageScore);

        return `
      <tr>
        <td class="rank">${rank}</td>
        <td><strong>${student.studentName}</strong></td>
        <td>${student.totalAttempts} attempts</td>
        <td>${student.averageScore}%</td>
        <td>${performanceBadge}</td>
      </tr>
    `;
    }).join('');
}

/**
 * Get performance badge based on average score
 */
function getPerformanceBadge(score) {
    if (score >= 80) {
        return '<span class="badge success">Excellent</span>';
    } else if (score >= 60) {
        return '<span class="badge warning">Good</span>';
    } else {
        return '<span class="badge danger">Needs Improvement</span>';
    }
}

/**
 * Populate most used quiz section
 */
function populateMostUsedQuiz(quiz) {
    document.getElementById("mostUsedQuizTitle").textContent = quiz.quizTitle || "N/A";
    document.getElementById("mostUsedQuizAttempts").textContent = quiz.attempts || 0;
    document.getElementById("mostUsedQuizScore").textContent = `${quiz.averageScore || 0}%`;
}

/**
 * Populate timeouted students table
 */
function populateTimeoutedStudentsTable(timeouts) {
    const tbody = document.getElementById("timeoutedStudentsTable");

    if (!timeouts || timeouts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #6c757d;">No timeout events recorded</td></tr>';
        return;
    }

    tbody.innerHTML = timeouts.map((timeout, index) => {
        const rank = index + 1;
        const date = new Date(timeout.attemptDate);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        return `
      <tr>
        <td class="rank">${rank}</td>
        <td><strong>${timeout.studentName}</strong></td>
        <td>${timeout.quizTitle}</td>
        <td><span class="badge danger">${timeout.timeoutDuration}</span></td>
        <td>${formattedDate}</td>
      </tr>
    `;
    }).join('');
}

// ========================================
// CHART RENDERING
// ========================================

/**
 * Render Pie Chart: Quiz Attempts per Subject
 */
function renderSubjectChart(data) {
    const ctx = document.getElementById("subjectChart").getContext("2d");

    // Destroy existing chart if it exists
    if (charts.subjectChart) {
        charts.subjectChart.destroy();
    }

    if (!data || data.length === 0) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#6c757d";
        ctx.textAlign = "center";
        ctx.fillText("No data available", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const labels = data.map(item => item.subject);
    const values = data.map(item => item.count);
    const colors = generateColors(data.length);

    charts.subjectChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render Bar Chart: Daily Active Users (Last 7 Days)
 */
function renderDailyUsersChart(data) {
    const ctx = document.getElementById("dailyUsersChart").getContext("2d");

    // Destroy existing chart if it exists
    if (charts.dailyUsersChart) {
        charts.dailyUsersChart.destroy();
    }

    if (!data || data.length === 0) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#6c757d";
        ctx.textAlign = "center";
        ctx.fillText("No data available", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const labels = data.map(item => formatDate(item.date));
    const values = data.map(item => item.count);

    charts.dailyUsersChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Active Users',
                data: values,
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: 'Number of Users'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Active Users: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render Line Chart: Quiz Attempts Over Time (Last 30 Days)
 */
function renderAttemptsTimeChart(data) {
    const ctx = document.getElementById("attemptsTimeChart").getContext("2d");

    // Destroy existing chart if it exists
    if (charts.attemptsTimeChart) {
        charts.attemptsTimeChart.destroy();
    }

    if (!data || data.length === 0) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#6c757d";
        ctx.textAlign = "center";
        ctx.fillText("No data available", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const labels = data.map(item => formatDate(item.date));
    const values = data.map(item => item.count);

    charts.attemptsTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quiz Attempts',
                data: values,
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                borderColor: 'rgba(118, 75, 162, 1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: 'rgba(118, 75, 162, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: 'Number of Attempts'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Attempts: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Generate random colors for charts
 */
function generateColors(count) {
    const baseColors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(80, 200, 120, 0.8)',
        'rgba(255, 157, 77, 0.8)',
        'rgba(231, 76, 60, 0.8)',
        'rgba(52, 152, 219, 0.8)',
        'rgba(155, 89, 182, 0.8)',
        'rgba(241, 196, 15, 0.8)'
    ];

    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

/**
 * Format date string for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}

/**
 * Show/hide loading spinner
 */
function showLoading(show) {
    document.getElementById("loading").style.display = show ? "block" : "none";
}

/**
 * Show/hide main content
 */
function showContent(show) {
    document.getElementById("content").style.display = show ? "block" : "none";
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById("errorMessage").textContent = message;
    document.getElementById("error").style.display = "block";
}

/**
 * Hide error message
 */
function hideError() {
    document.getElementById("error").style.display = "none";
}

/**
 * Refresh analytics data
 */
function refreshData() {
    fetchAnalyticsData();
}

/**
 * Go back to teacher dashboard
 */
function goBack() {
    window.location.href = "teacher.html";
}

// ========================================
// INITIALIZATION
// ========================================

// Fetch analytics data when page loads
document.addEventListener("DOMContentLoaded", () => {
    console.log("Analytics Dashboard Loaded");
    console.log("User:", userName, "| Role:", role);

    // Fetch data
    fetchAnalyticsData();
    fetchPollResults();
});

// Auto-refresh analytics every 10 seconds to update online count and poll results
setInterval(() => {
    if (document.getElementById("content").style.display !== "none") {
        fetchAnalyticsData();
        fetchPollResults();
    }
}, 10000);
