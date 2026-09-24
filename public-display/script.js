// Rejimni o‘zgartirish (Dark / Light mode)
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        themeToggle.textContent = isDark ? "☀️" : "🌙";
        localStorage.setItem("theme", isDark ? "dark" : "light");
    });
}

// Soatni yangilash funksiyasi
function updateLiveClock() {
    const clockEl = document.getElementById("liveClock");
    if (!clockEl) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hours}:${minutes}:${seconds}`;
}
setInterval(updateLiveClock, 1000);
updateLiveClock();

// Sahifa yuklanganda rejimni qayta tiklash
window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" && themeToggle) {
        document.body.classList.add("dark-mode");
        themeToggle.textContent = "☀️";
    }
});

// Sozlamalar modali boshqaruvi
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const resetApiBtn = document.getElementById("resetApiBtn");
const apiUrlInput = document.getElementById("apiUrlInput");

const DEFAULT_APP_API_URL = "https://navbat.namspi.uz/api/tickets/today/";

if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener("click", () => {
        let currentUrl = localStorage.getItem("API_URL");
        if (!currentUrl || currentUrl.includes("/tickets/serving/")) {
            currentUrl = DEFAULT_APP_API_URL;
        }
        apiUrlInput.value = currentUrl;
        settingsModal.classList.add("open");
    });

    cancelSettingsBtn.addEventListener("click", () => {
        settingsModal.classList.remove("open");
    });

    resetApiBtn.addEventListener("click", () => {
        apiUrlInput.value = DEFAULT_APP_API_URL;
    });

    saveSettingsBtn.addEventListener("click", () => {
        const val = apiUrlInput.value.trim();
        if (val) {
            localStorage.setItem("API_URL", val);
        } else {
            localStorage.removeItem("API_URL");
        }
        settingsModal.classList.remove("open");
        if (typeof window.reloadApiUrl === "function") {
            window.reloadApiUrl();
        } else {
            location.reload();
        }
    });
}