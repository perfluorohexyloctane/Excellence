// Excellence Treasure Hunt - Core API Session & Question Controller
const API_BASE = "https://codecyprus.org/th/api";
// Runtime state variables for the active player and current question
let sessionID = "";
let canBeSkipped = false;
let currentQuestion = null;
let playerName = "";
// Parse query parameters passed in the URL (e.g. start.html?uuid=...&name=...&duration=...)
const params = new URLSearchParams(location.search);
const treasureHuntID = params.get("uuid") || "";
const appName = params.get("app") || "ExcellenceApp";
const huntNameParam = params.get("name") || "Treasure Hunt";
const huntDurationParam = Number(params.get("duration") || 0);
/*
 Displays or clears a status/error banner on the page
 @param {string} elementId - The ID of the banner element (e.g., "sessionBanner", "resultMessage")
 @param {string} message - Text to display; pass an empty string to hide the banner
 @param {string} type - Styling modifier class ("info", "success", or "error")
*/
function setBanner(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    // Reset and hide banner if no message is provided
    if (!message) {
        el.className = "status-banner";
        el.textContent = "";
        return;
    }
    el.className = `status-banner visible ${type || "info"}`;
    el.textContent = message;
}
//Switches the visible UI card on start.html by showing only the requested section and hiding the remaining two.
function showView(viewId) {
    ["resumeSessionCard", "playerNameEntry", "answerContainer"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === viewId ? "block" : "none";
    });
}
//Removes all saved treasure hunt session cookies (uses deleteCookie from cookies.js)
function clearSessionCookies() {
    deleteCookie("playerName");
    deleteCookie("sessionID");
    deleteCookie("treasureHuntID");
    deleteCookie("sessionStartedAt");
    deleteCookie("huntMaxDuration");
}
/*
 Fetches the current question from the /question endpoint using the active sessionID.
 Redirects to leaderboard.html if the hunt is completed, or resets to name entry if expired.
*/
function fetchQuestion() {
    const questionURL = `${API_BASE}/question?session=${encodeURIComponent(sessionID)}`;
    fetch(questionURL)
        .then((response) => {
            if (!response.ok) throw new Error(`Question API error (${response.status})`);
            return response.json();
        })
        .then((questionData) => {
            if (questionData.status === "OK") {
                // If all questions have been answered/skipped, navigate to the leaderboard
                if (questionData.completed) {
                    location.href = "leaderboard.html";
                    return;
                }
                // Store current question details and update the Skip button visibility
                currentQuestion = questionData;
                canBeSkipped = Boolean(questionData.canBeSkipped);
                syncSkipButton();
                // Render the question text (supports HTML formatting returned by the API)
                const qEl = document.getElementById("q");
                if (qEl) qEl.innerHTML = questionData.questionText;
            } else {
                // Session is invalid or expired on the server: clear cookies and prompt for a new session
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
//Submits the user's typed answer to the /answer endpoint and handles feedback, progression to the next question, or redirection on hunt completion/timeout
function submitUserAnswer() {
    const input = document.getElementById("userAnswer");
    const answer = input ? input.value.trim() : "";
    // Prevent submitting blank answers
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
                // Show API feedback ("success" if correct, "error" if incorrect)
                setBanner("resultMessage", answerData.message, answerData.correct ? "success" : "error");
                // Redirect if this answer finished the treasure hunt
                if (answerData.completed) {
                    location.href = "leaderboard.html";
                    return;
                }
                // On a correct answer, clear the input field and load the next question
                if (answerData.correct) {
                    if (input) input.value = "";
                    fetchQuestion();
                }
            } else {
                const errorText = (answerData.errorMessages || ["Unknown error"]).join(", ");
                // Redirect to leaderboard if the session ended or timer expired mid-hunt
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
// Enables/disables and shows/hides the Skip Question button based on canBeSkipped
function syncSkipButton() {
    const skipBtn = document.getElementById("skipBtn");
    if (!skipBtn) return;
    skipBtn.disabled = !canBeSkipped;
    skipBtn.style.display = canBeSkipped ? "inline-block" : "none";
}
// Calls the /skip endpoint to bypass the current question if skipping is allowed
function skipQuestion() {
    if (!sessionID) {
        setBanner("sessionBanner", "No active session found.", "error");
        return;
    }
    if (!canBeSkipped) {
        setBanner("resultMessage", "This question cannot be skipped.", "error");
        return;
    }
    // Temporarily disable button to prevent duplicate skip requests while fetching
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
                // Clear any partial answer typed before skipping
                const input = document.getElementById("userAnswer");
                if (input) input.value = "";
                // Redirect if skipping the final question completed the hunt
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
// Populates leaderboard.html with the top 20 sorted players and the current player's score
function displayLeaderboard() {
    // Fall back to the saved cookie if sessionID isn't already in memory
    const activeSession = sessionID || getCookie("sessionID");
    if (!activeSession) {
        setBanner("sessionBanner", "No active session found. Start a treasure hunt first.", "error");
        return;
    }
    const leaderboardURL = `${API_BASE}/leaderboard?session=${encodeURIComponent(activeSession)}&sorted&limit=20`;
    const scoreURL = `${API_BASE}/score?session=${encodeURIComponent(activeSession)}`;
    // 1. Fetch and render the sorted leaderboard table
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
                // Build table header row
                const headerRow = document.createElement("tr");
                ["#", "Name", "Score", "Completion Date"].forEach((headData) => {
                    const header = document.createElement("th");
                    header.innerText = headData;
                    headerRow.appendChild(header);
                });
                tableHeader.appendChild(headerRow);
                // Build a row for each player entry
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
    // 2. Fetch and display the current player's individual score and name
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
// Starts a brand-new session via the /start endpoint, saves session metadata to cookies for 7 days, switches to the question view, and loads the first question
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
                // Persist session details in cookies for 7 days so progress survives reloads
                setCookie("playerName", playerName, 7);
                setCookie("sessionID", sessionID, 7);
                setCookie("treasureHuntID", treasureHuntID, 7);
                setCookie("sessionStartedAt", String(Date.now()), 7);
                setCookie("huntMaxDuration", String(huntDurationParam), 7);
                showView("answerContainer");
                fetchQuestion();
            } else {
                // e.g. Duplicate player name or hunt not currently active
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
// Restores playerName and sessionID from cookies and resumes gameplay
function resumeSavedSession() {
    playerName = getCookie("playerName");
    sessionID = getCookie("sessionID");
    setBanner("sessionBanner", `Resumed session for ${playerName}.`, "info");
    showView("answerContainer");
    fetchQuestion();
}
// Clears existing cookies and shows the player name form to begin a fresh game
function startFreshSessionPrompt() {
    clearSessionCookies();
    setBanner("sessionBanner", "", "");
    showView("playerNameEntry");
}
// Entry point for start.html: validates that a hunt UUID is present in the URL, then decides whether to offer resuming a saved session or prompt for a player name
function startGame() {
    if (!treasureHuntID) {
        setBanner("sessionBanner", "No treasure hunt selected. Returning to hunt list...", "error");
        setTimeout(() => { location.href = "app.html"; }, 1200);
        return;
    }

    const titleEl = document.getElementById("entryHuntTitle");
    if (titleEl) titleEl.textContent = huntNameParam;
    // Check cookies for an existing session matching the selected treasure hunt
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
// Form handler for #playerNameForm: validates input and triggers session creation
function getPlayerNameEntry() {
    const value = document.getElementById("playerName").value.trim();
    if (value === "") {
        setBanner("sessionBanner", "Please enter a player or team name first.", "error");
        return;
    }
    createNewSession(value);
}
// Resets all session cookies and returns the user to the hunt selection page
function refreshGame() {
    clearSessionCookies();
    location.href = "app.html";
}
// Automatically initialize gameplay when loaded on a page containing the play UI (start.html)
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("playerNameEntry") && document.getElementById("answerContainer")) {
        startGame();
    }
});
