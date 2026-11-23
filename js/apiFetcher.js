// Excellence Treasure Hunt - Core API Session & Question Controller
const API_BASE = "https://codecyprus.org/th/api";

let sessionID = "";
let canBeSkipped = false;
let currentQuestion = null;
let playerName = "";

const params = new URLSearchParams(location.search);
const treasureHuntID = params.get("uuid") || "";
const appName = params.get("app") || "ExcellenceApp";
const huntNameParam = params.get("name") || "Treasure Hunt";
const huntDurationParam = Number(params.get("duration") || 0);

function setBanner(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!message) {
        el.className = "status-banner";
        el.textContent = "";
        return;
    }
    el.className = `status-banner visible ${type || "info"}`;
    el.textContent = message;
}

function showView(viewId) {
    ["resumeSessionCard", "playerNameEntry", "answerContainer"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === viewId ? "block" : "none";
    });
}

function clearSessionCookies() {
    deleteCookie("playerName");
    deleteCookie("sessionID");
    deleteCookie("treasureHuntID");
    deleteCookie("sessionStartedAt");
    deleteCookie("huntMaxDuration");
}

function fetchQuestion() {
    const questionURL = `${API_BASE}/question?session=${encodeURIComponent(sessionID)}`;
    fetch(questionURL)
        .then((response) => {
            if (!response.ok) throw new Error(`Question API error (${response.status})`);
            return response.json();
        })
        .then((questionData) => {
            if (questionData.status === "OK") {
                if (questionData.completed) {
                    location.href = "leaderboard.html";
                    return;
                }
                currentQuestion = questionData;
                canBeSkipped = Boolean(questionData.canBeSkipped);
                syncSkipButton();

                const qEl = document.getElementById("q");
                if (qEl) qEl.innerHTML = questionData.questionText;
            } else {
                const msg = (questionData.errorMessages || ["Session invalid or expired."]).join(" ");
                setBanner("sessionBanner", `${msg} Please start a new session.`, "error");
                clearSessionCookies();
                showView("playerNameEntry");
            }
        })
        .catch((error) => {
            setBanner("sessionBanner", `Network error while loading question: ${error.message}`, "error");
        });
}

function submitUserAnswer() {
    const input = document.getElementById("userAnswer");
    const answer = input ? input.value.trim() : "";

    if (!answer) {
        setBanner("resultMessage", "Please enter an answer before submitting.", "error");
        return;
    }

    const answerURL = `${API_BASE}/answer?session=${encodeURIComponent(sessionID)}&answer=${encodeURIComponent(answer)}`;
    fetch(answerURL)
        .then((response) => {
            if (!response.ok) throw new Error(`Answer API error (${response.status})`);
            return response.json();
        })
        .then((answerData) => {
            if (answerData.status === "OK") {
                setBanner("resultMessage", answerData.message, answerData.correct ? "success" : "error");
                if (answerData.completed) {
                    location.href = "leaderboard.html";
                    return;
                }
                if (answerData.correct) {
                    if (input) input.value = "";
                    fetchQuestion();
                }
            } else {
                const errorText = (answerData.errorMessages || ["Unknown error"]).join(", ");
                if (errorText.includes("Finished session") || errorText.includes("run out of time")) {
                    location.href = "leaderboard.html";
                    return;
                }
                setBanner("resultMessage", `Error: ${errorText}`, "error");
            }
        })
        .catch((error) => {
            setBanner("resultMessage", `Could not submit answer: ${error.message}`, "error");
        });
}

function syncSkipButton() {
    const skipBtn = document.getElementById("skipBtn");
    if (!skipBtn) return;
    skipBtn.disabled = !canBeSkipped;
    skipBtn.style.display = canBeSkipped ? "inline-block" : "none";
}

function skipQuestion() {
    if (!sessionID) {
        setBanner("sessionBanner", "No active session found.", "error");
        return;
    }
    if (!canBeSkipped) {
        setBanner("resultMessage", "This question cannot be skipped.", "error");
        return;
    }

    const skipBtn = document.getElementById("skipBtn");
    if (skipBtn) skipBtn.disabled = true;

    const skipURL = `${API_BASE}/skip?session=${encodeURIComponent(sessionID)}`;
    fetch(skipURL)
        .then((response) => {
            if (!response.ok) throw new Error(`Skip API error (${response.status})`);
            return response.json();
        })
        .then((skipData) => {
            if (skipData.status === "OK") {
                setBanner("resultMessage", skipData.message || "Question skipped.", "info");
                const input = document.getElementById("userAnswer");
                if (input) input.value = "";
                if (skipData.completed) {
                    location.href = "leaderboard.html";
                    return;
                }
                fetchQuestion();
            } else {
                const msg = (skipData.errorMessages || ["Could not skip question."]).join(" ");
                setBanner("resultMessage", msg, "error");
                syncSkipButton();
            }
        })
        .catch((error) => {
            setBanner("resultMessage", `Network error while skipping question: ${error.message}`, "error");
            syncSkipButton();
        });
}

function displayLeaderboard() {
    const activeSession = sessionID || getCookie("sessionID");
    if (!activeSession) {
        setBanner("sessionBanner", "No active session found. Start a treasure hunt first.", "error");
        return;
    }
    const leaderboardURL = `${API_BASE}/leaderboard?session=${encodeURIComponent(activeSession)}&sorted&limit=20`;
    const scoreURL = `${API_BASE}/score?session=${encodeURIComponent(activeSession)}`;

    fetch(leaderboardURL)
        .then((response) => {
            if (!response.ok) throw new Error(`Leaderboard API error (${response.status})`);
            return response.json();
        })
        .then((leaderboardData) => {
            if (leaderboardData.status === "OK") {
                document.getElementById("leaderboardHeader").innerText = leaderboardData.treasureHuntName;
                document.getElementById("leaderboard").style.display = "block";
                const users = leaderboardData.leaderboard || [];
                const tableHeader = document.getElementById("usersTableHeader");
                const tableBody = document.getElementById("usersTableBody");
                tableHeader.innerHTML = "";
                tableBody.innerHTML = "";

                const headerRow = document.createElement("tr");
                ["#", "Name", "Score", "Completion Date"].forEach((headData) => {
                    const header = document.createElement("th");
                    header.innerText = headData;
                    headerRow.appendChild(header);
                });
                tableHeader.appendChild(headerRow);

                users.forEach((user, idx) => {
                    const row = document.createElement("tr");
                    const formattedTime = user.completionTime ? new Date(user.completionTime).toLocaleDateString() : "In progress";
                    [idx + 1, user.player, user.score, formattedTime].forEach((text) => {
                        const cell = document.createElement("td");
                        cell.textContent = text;
                        row.appendChild(cell);
                    });
                    tableBody.appendChild(row);
                });
            }
        })
        .catch(() => {});

    fetch(scoreURL)
        .then((response) => response.json())
        .then((scoreData) => {
            if (scoreData.status === "OK") {
                const scoreEl = document.getElementById("playerScore");
                const playerEl = document.getElementById("scorePlayerName");
                if (scoreEl) scoreEl.textContent = scoreData.score;
                if (playerEl && scoreData.player) playerEl.textContent = scoreData.player;
            }
        })
        .catch(() => {});
}

function createNewSession(name) {
    setBanner("sessionBanner", "", "");
    const startingURL = `${API_BASE}/start?player=${encodeURIComponent(name)}&app=${encodeURIComponent(appName)}&treasure-hunt-id=${encodeURIComponent(treasureHuntID)}`;
    fetch(startingURL)
        .then((response) => {
            if (!response.ok) throw new Error(`Start API error (${response.status})`);
            return response.json();
        })
        .then((startData) => {
            if (startData.status === "OK") {
                sessionID = startData.session;
                playerName = name;
                setCookie("playerName", playerName, 7);
                setCookie("sessionID", sessionID, 7);
                setCookie("treasureHuntID", treasureHuntID, 7);
                setCookie("sessionStartedAt", String(Date.now()), 7);
                setCookie("huntMaxDuration", String(huntDurationParam), 7);
                showView("answerContainer");
                fetchQuestion();
            } else {
                const msg = (startData.errorMessages || ["Could not start session."]).join(" ");
                setBanner("sessionBanner", msg, "error");
                showView("playerNameEntry");
            }
        })
        .catch((error) => {
            setBanner("sessionBanner", `Network error starting session: ${error.message}`, "error");
            showView("playerNameEntry");
        });
}

function resumeSavedSession() {
    playerName = getCookie("playerName");
    sessionID = getCookie("sessionID");
    setBanner("sessionBanner", `Resumed session for ${playerName}.`, "info");
    showView("answerContainer");
    fetchQuestion();
}

function startFreshSessionPrompt() {
    clearSessionCookies();
    setBanner("sessionBanner", "", "");
    showView("playerNameEntry");
}

function startGame() {
    if (!treasureHuntID) {
        setBanner("sessionBanner", "No treasure hunt selected. Returning to hunt list...", "error");
        setTimeout(() => { location.href = "app.html"; }, 1200);
        return;
    }

    const titleEl = document.getElementById("entryHuntTitle");
    if (titleEl) titleEl.textContent = huntNameParam;

    const savedName = getCookie("playerName");
    const savedSession = getCookie("sessionID");
    const savedHuntID = getCookie("treasureHuntID");

    if (savedName !== "" && savedSession !== "" && savedHuntID === treasureHuntID) {
        const resumeNameEl = document.getElementById("resumePlayerName");
        const resumeHuntEl = document.getElementById("resumeHuntName");
        if (resumeNameEl) resumeNameEl.textContent = savedName;
        if (resumeHuntEl) resumeHuntEl.textContent = huntNameParam;
        showView("resumeSessionCard");
    } else {
        showView("playerNameEntry");
    }
}

function getPlayerNameEntry() {
    const value = document.getElementById("playerName").value.trim();
    if (value === "") {
        setBanner("sessionBanner", "Please enter a player or team name first.", "error");
        return;
    }
    createNewSession(value);
}

function refreshGame() {
    clearSessionCookies();
    location.href = "app.html";
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("playerNameEntry") && document.getElementById("answerContainer")) {
        startGame();
    }
});
