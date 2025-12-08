const API_BASE = "http://localhost:4000/api";

const loginForm = document.getElementById("loginForm");
const statusEl = document.getElementById("status");
//const protectedArea = document.getElementById("protectedArea");
//const protectedText = document.getElementById("protectedText");
const logoutBtn = document.getElementById("logoutBtn");

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function post(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// LOGIN
loginForm.onsubmit = async (e) => {
  e.preventDefault();

  const rid = loginForm.rid.value;
  const password = loginForm.password.value;

  setStatus("Checking credentials...");

  const res = await post(API_BASE + "/auth/login", { rid, password });

  if (res.token) {
    localStorage.setItem("token", res.token);
    localStorage.setItem("role", res.role);
    localStorage.setItem("name",res.name);

    setStatus("Login successful!");
     if (res.role === "teacher") {
        window.location.href = "teacher.html";
    } else {
        window.location.href = "student.html";
    }
  } else {
    setStatus(res.message);
  }
};

async function loadProtected() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const res = await fetch(API_BASE + "/protected", {
    headers: { Authorization: "Bearer " + token },
  });

  const data = await res.json();

  if (res.status === 200) {
    protectedArea.classList.remove("hidden");
    protectedText.textContent = data.message;
  } else {
    protectedArea.classList.add("hidden");
    setStatus("Session expired");
  }
}

logoutBtn.onclick = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  protectedArea.classList.add("hidden");
  setStatus("Logged out");
};

//if (localStorage.getItem("token")) loadProtected();
