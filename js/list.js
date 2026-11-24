// Excellence Treasure Hunt - Challenge List Controller
const API_LIST_URL = "https://codecyprus.org/th/api/list";
//In-memory store of fetched treasure hunts so client-side search can filter without fetching again
let cachedHunts = [];

/*
 Formats a millisecond duration into a human-friendly minutes/hours string
 @param {number} ms - Duration in milliseconds
 @returns {string} Formatted duration (e.g., "45 min", "1h 30m", "2h", or "Untimed")
*/
function formatDuration(ms) {
    if (!ms || ms <= 0) return "Untimed";
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}
/*
 Displays or clears a status/error banner at the top of the challenge list
 @param {string} message - Message to show; pass an empty string to hide the banner
 @param {string} [type="info"] - Banner styling modifier ("info", "success", or "error")
*/
function showListStatus(message, type) {
    const banner = document.getElementById("statusBanner");
    if (!banner) return;
    if (!message) {
        banner.className = "status-banner";
        banner.textContent = "";
        return;
    }
    banner.className = `status-banner visible ${type || "info"}`;
    banner.textContent = message;
}

//Renders three placeholder skeleton cards inside #challenges while API data is loading
function showSkeletons() {
    const list = document.getElementById("challenges");
    if (!list) return;
    list.innerHTML = `
    <li class="skeleton-card" aria-hidden="true"></li>
    <li class="skeleton-card" aria-hidden="true"></li>
    <li class="skeleton-card" aria-hidden="true"></li>
  `;
}
/*
 Builds and renders clickable treasure hunt cards inside the #challenges list
 Checks cookies to highlight if the player already has an active session for a hunt
 @param {Array<Object>} hunts - Array of treasure hunt objects returned by the API
*/
function renderHunts(hunts) {
    const list = document.getElementById("challenges");
    if (!list) return;
    list.innerHTML = "";
    // Show an empty-state message if the API returned no hunts or search found no matches
    if (!hunts || hunts.length === 0) {
        const empty = document.createElement("li");
        empty.className = "card empty-state";
        empty.textContent = "No matching treasure hunts found right now.";
        list.appendChild(empty);
        return;
    }
    // Safely read saved session cookies (if cookies.js is loaded) to detect resumable games
    const savedHuntId = typeof getCookie === "function" ? getCookie("treasureHuntID") : "";
    const savedSession = typeof getCookie === "function" ? getCookie("sessionID") : "";

    hunts.forEach((hunt) => {
        const item = document.createElement("li");
        // Construct the link to start.html passing hunt metadata via URL query parameters
        const link = document.createElement("a");
        link.className = "hunt-card-link";
        link.href = `start.html?uuid=${encodeURIComponent(hunt.uuid)}&app=ExcellenceApp&name=${encodeURIComponent(hunt.name)}&duration=${encodeURIComponent(hunt.maxDuration || 0)}`;
        // Card header & title
        const header = document.createElement("div");
        header.className = "hunt-card-header";

        const title = document.createElement("h2");
        title.className = "hunt-card-title";
        title.textContent = hunt.name || "Untitled Treasure Hunt";
        header.appendChild(title);
        // Hunt description
        const desc = document.createElement("p");
        desc.className = "hunt-card-desc";
        desc.textContent = hunt.description || "Join this live CodeCyprus Treasure Hunt challenge.";
        // Metadata badges row (Duration, Prize, and Resume indicator)
        const badges = document.createElement("div");
        badges.className = "badge-row";

        const durationBadge = document.createElement("span");
        durationBadge.className = "badge badge-active";
        durationBadge.textContent = `Duration: ${formatDuration(hunt.maxDuration)}`;
        badges.appendChild(durationBadge);

        if (hunt.hasPrize) {
            const prizeBadge = document.createElement("span");
            prizeBadge.className = "badge badge-prize";
            prizeBadge.textContent = "Prize Available";
            badges.appendChild(prizeBadge);
        }
        // Highlight card if an unfinished session cookie matches this hunt's UUID
        if (savedSession && savedHuntId === hunt.uuid) {
            const resumeBadge = document.createElement("span");
            resumeBadge.className = "badge badge-resume";
            resumeBadge.textContent = "Session In Progress — Tap to Resume";
            badges.appendChild(resumeBadge);
        }
        // Assemble card DOM hierarchy and append to the list
        link.appendChild(header);
        link.appendChild(desc);
        link.appendChild(badges);
        item.appendChild(link);
        list.appendChild(item);
    });
}

//Fetches the list of available treasure hunts from the CodeCyprus /list endpoint, caches the result in `cachedHunts`, and renders the cards
function getChallenges() {
    showListStatus("", "");
    showSkeletons();

    fetch(API_LIST_URL)
        .then((res) => {
            if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
            return res.json();
        })
        .then((thcResponse) => {
            if (thcResponse.status !== "OK") {
                const msg = (thcResponse.errorMessages || ["Unknown API error"]).join(" ");
                showListStatus(`Unable to load treasure hunts: ${msg}`, "error");
                renderHunts([]);
                return;
            }
            // Save to cache for instant search filtering and render the list
            cachedHunts = thcResponse.treasureHunts || [];
            renderHunts(cachedHunts);
        })
        .catch((err) => {
            showListStatus(`Could not reach CodeCyprus server (${err.message}). Please check your connection and try again.`, "error");
            renderHunts([]);
        });
}
// Initialize search filtering, refresh button, and initial API fetch once the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("huntSearch");
    const refreshBtn = document.getElementById("refreshHuntsBtn");
    // Filter cachedHunts live as the user types in the search bar
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            if (!query) {
                renderHunts(cachedHunts);
                return;
            }
            const filtered = cachedHunts.filter((h) =>
                (h.name || "").toLowerCase().includes(query) ||
                (h.description || "").toLowerCase().includes(query)
            );
            renderHunts(filtered);
        });
    }
    // Re-fetch fresh hunt data from the server when Refresh is clicked
    if (refreshBtn) {
        refreshBtn.addEventListener("click", getChallenges);
    }
    // Load treasure hunts immediately on page open
    getChallenges();
});
