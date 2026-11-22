// Excellence Treasure Hunt - Challenge List Controller
const API_LIST_URL = "https://codecyprus.org/th/api/list";
let cachedHunts = [];

/**
 * Formats millisecond duration into a human-friendly minutes/hours string.
 */
function formatDuration(ms) {
    if (!ms || ms <= 0) return "Untimed";
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

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

function showSkeletons() {
    const list = document.getElementById("challenges");
    if (!list) return;
    list.innerHTML = `
    <li class="skeleton-card" aria-hidden="true"></li>
    <li class="skeleton-card" aria-hidden="true"></li>
    <li class="skeleton-card" aria-hidden="true"></li>
  `;
}

function renderHunts(hunts) {
    const list = document.getElementById("challenges");
    if (!list) return;
    list.innerHTML = "";

    if (!hunts || hunts.length === 0) {
        const empty = document.createElement("li");
        empty.className = "card empty-state";
        empty.textContent = "No matching treasure hunts found right now.";
        list.appendChild(empty);
        return;
    }

    const savedHuntId = typeof getCookie === "function" ? getCookie("treasureHuntID") : "";
    const savedSession = typeof getCookie === "function" ? getCookie("sessionID") : "";

    hunts.forEach((hunt) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.className = "hunt-card-link";
        link.href = `start.html?uuid=${encodeURIComponent(hunt.uuid)}&app=ExcellenceApp&name=${encodeURIComponent(hunt.name)}&duration=${encodeURIComponent(hunt.maxDuration || 0)}`;

        const header = document.createElement("div");
        header.className = "hunt-card-header";

        const title = document.createElement("h2");
        title.className = "hunt-card-title";
        title.textContent = hunt.name || "Untitled Treasure Hunt";
        header.appendChild(title);

        const desc = document.createElement("p");
        desc.className = "hunt-card-desc";
        desc.textContent = hunt.description || "Join this live CodeCyprus Treasure Hunt challenge.";

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

        if (savedSession && savedHuntId === hunt.uuid) {
            const resumeBadge = document.createElement("span");
            resumeBadge.className = "badge badge-resume";
            resumeBadge.textContent = "Session In Progress — Tap to Resume";
            badges.appendChild(resumeBadge);
        }

        link.appendChild(header);
        link.appendChild(desc);
        link.appendChild(badges);
        item.appendChild(link);
        list.appendChild(item);
    });
}

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
            cachedHunts = thcResponse.treasureHunts || [];
            renderHunts(cachedHunts);
        })
        .catch((err) => {
            showListStatus(`Could not reach CodeCyprus server (${err.message}). Please check your connection and try again.`, "error");
            renderHunts([]);
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("huntSearch");
    const refreshBtn = document.getElementById("refreshHuntsBtn");

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

    if (refreshBtn) {
        refreshBtn.addEventListener("click", getChallenges);
    }

    getChallenges();
});
