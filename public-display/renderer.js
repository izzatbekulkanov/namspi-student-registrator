const API_URL = "https://navbat.namspi.uz/api/tickets/today/";

const DEFAULT_API_URL = "https://navbat.namspi.uz/api/tickets/serving/";
let currentApiUrl = localStorage.getItem("API_URL") || DEFAULT_API_URL;

// Oldingi navbatlarni saqlash va yangi navbatlarni aniqlash
let announcedTicketIds = new Set();
let isFirstLoad = true;

// E’lonlar navbati (Audio / Visual Queue)
let announcementQueue = [];
let isAnnouncing = false;

// Raqamlarni o'zbekcha tartib sonlarga aylantirish (masalan: 10 -> "o‘ninchi", 4 -> "to‘rtinchi")
function numberToUzbekOrdinal(val) {
    if (val === null || val === undefined) return "";
    let str = String(val).trim();

    // Agar harfli prefiks bo'lsa (masalan: "A-0010" yoki "B 5")
    const match = str.match(/^([A-Za-z]+)[\s\-_]*0*(\d+)$/);
    let prefix = "";
    let numPart = str;

    if (match) {
        prefix = match[1].toUpperCase() + " ";
        numPart = match[2];
    } else {
        numPart = str.replace(/^0+/, "");
        if (!numPart) numPart = "0";
    }

    const n = parseInt(numPart, 10);
    if (isNaN(n) || n <= 0) return str;

    const ones = ['', 'bir', 'ikki', 'uch', 'to‘rt', 'besh', 'olti', 'yetti', 'sakkiz', 'to‘qqiz'];
    const tens = ['', 'o‘n', 'yigirma', 'o‘ttiz', 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', 'to‘qson'];

    function cardinal(num) {
        if (num === 0) return '';
        let res = [];
        if (num >= 1000) {
            const th = Math.floor(num / 1000);
            res.push((th > 1 ? cardinal(th) + ' ' : '') + 'ming');
            num %= 1000;
        }
        if (num >= 100) {
            const h = Math.floor(num / 100);
            res.push((h > 1 ? ones[h] + ' ' : '') + 'yuz');
            num %= 100;
        }
        if (num >= 10) {
            res.push(tens[Math.floor(num / 10)]);
            num %= 10;
        }
        if (num > 0) {
            res.push(ones[num]);
        }
        return res.join(' ').trim();
    }

    const card = cardinal(n);
    if (!card) return str;

    const words = card.split(' ');
    let last = words.pop();

    if (last === 'ellik') {
        last = 'elliginchi';
    } else if (last.endsWith('i') || last.endsWith('a')) {
        last += 'nchi';
    } else {
        last += 'inchi';
    }

    words.push(last);
    return prefix + words.join(' ');
}

function capitalizeFirstLetter(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Rasmiy e'lon matnini shakllantirish (masalan: "O‘ninchi raqamli navbat egasi, to‘rtinchi oynaga marhamat.")
function buildSpeechText(ticket) {
    const ticketOrdinal = numberToUzbekOrdinal(ticket.ticket_number);
    const windowOrdinal = ticket.window_number ? numberToUzbekOrdinal(ticket.window_number) : null;

    let sentence;
    if (windowOrdinal) {
        sentence = `${ticketOrdinal} raqamli navbat egasi, ${windowOrdinal} oynaga marhamat.`;
    } else {
        sentence = `${ticketOrdinal} raqamli navbat egasi, xizmat ko‘rsatish oynasiga marhamat.`;
    }
    return capitalizeFirstLetter(sentence);
}

async function fetchServingTickets() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();

        const tbody = document.getElementById("ticket-body");
        const waitingBody = document.getElementById("waiting-body");

        const servingTickets = data.tickets?.serving || [];
        const waitingTickets = data.tickets?.waiting || [];

        // Yangi yoki qayta chaqirilgan navbatlarni aniqlash
        const newTickets = servingTickets.filter(ticket =>
            !previousTickets.some(prev =>
                prev.ticket_number === ticket.ticket_number &&
                prev.window_number === ticket.window_number &&
                (prev.started_at === ticket.started_at)
            )
        );

        // Yangi navbatlarni e’lonlar navbatiga qo‘shish
        if (newTickets.length > 0) {
            announcementQueue.push(...newTickets);
            if (!isAnnouncing) {
                announceNextTicket();
            }
        }

        // 1. Hizmat ko'rsatilayotganlar jadvalini yangilash
        tbody.innerHTML = "";
        servingTickets.forEach(ticket => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${ticket.ticket_number}</td>
                <td>${ticket.window_number || "—"}</td>
            `;
            tbody.appendChild(row);
        });

        // 2. Kutayotganlar jadvalini yangilash
        waitingBody.innerHTML = "";
        waitingTickets.forEach(ticket => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${ticket.ticket_number}</td>
                <td>Kutmoqda</td>
            `;
            waitingBody.appendChild(row);
        });

        // Oldingi navbatlarni yangilash
        previousTickets = [...servingTickets];

    } catch (error) {
        console.error("❌ API xatolik:", error);
    }
}

// E’lon qilish funksiyasi (Ding-dong + Microsoft Edge TTS)
async function announceNextTicket() {
    if (isAnnouncing || announcementQueue.length === 0) return;

    isAnnouncing = true;
    const ticket = announcementQueue.shift();

    const announcementEl = document.getElementById("announcement");
    const ticketEl = document.getElementById("announcement-ticket");
    const windowEl = document.getElementById("announcement-window");

    const windowLabel = ticket.window_number ? `${ticket.window_number} - oyna` : "Qabul oynasi";
    const speechText = buildSpeechText(ticket);

    // Vizual ko'rinishni yangilash
    if (ticketEl) ticketEl.textContent = ticket.ticket_number;
    if (windowEl) windowEl.textContent = windowLabel;
    if (announcementEl) announcementEl.classList.add("active");

    // Edge TTS audioni orqa fonda tayyorlab olish
    const ttsPromise = (async () => {
        if (window.electronAPI && typeof window.electronAPI.getTTSAudio === "function") {
            try {
                return await window.electronAPI.getTTSAudio(speechText, "uz-UZ-MadinaNeural");
            } catch (err) {
                console.error("❌ Edge TTS generatsiya xatosi:", err);
                return null;
            }
        }
        return null;
    })();

    // 1. Ding-dong qo'ng'irog'i (Chime)
    const dingDongAudio = new Audio("assets/sound/ding-dong.mp3");

    // E'lonni yakunlash va keyingisiga o'tish
    const finishAnnouncement = () => {
        setTimeout(() => {
            if (announcementEl) announcementEl.classList.remove("active");
            isAnnouncing = false;
            announceNextTicket();
        }, 1500); // Ovoz tugagach, 1.5 soniya ko'rinib turadi
    };

    // 2. Ovozli xabarni o'ynatish
    const playSpeech = async () => {
        try {
            const ttsAudioUrl = await ttsPromise;
            let voiceAudio;

            if (ttsAudioUrl) {
                voiceAudio = new Audio(ttsAudioUrl);
            } else {
                // Agar Edge TTS ishlamasa, zaxira voice_maftuna.wav ishlatiladi
                console.warn("⚠️ Edge TTS mavjud emas, zaxira ovoz ishlatilmoqda.");
                voiceAudio = new Audio("assets/sound/voice_maftuna.wav");
            }

            voiceAudio.onended = finishAnnouncement;
            voiceAudio.onerror = (e) => {
                console.error("❌ Ovoz ijro xatosi:", e);
                finishAnnouncement();
            };

            await voiceAudio.play();
        } catch (error) {
            console.error("❌ Ovozni chalishda xatolik:", error);
            finishAnnouncement();
        }
    };

    dingDongAudio.onended = playSpeech;
    dingDongAudio.onerror = (e) => {
        console.error("❌ Ding-dong ijro xatosi:", e);
        playSpeech();
    };

    // Ding-dongni boshlash
    dingDongAudio.play().catch(error => {
        console.error("❌ Ding-dong boshlanmadi:", error);
        playSpeech();
    });
}

// Har 3 soniyada yangilab turish
setInterval(fetchServingTickets, 3000);
fetchServingTickets();

// ==================== AUTO-UPDATE BOSHQARUVI ====================
if (window.electronAPI) {
    const updateModal = document.getElementById("update-modal");
    const newVersionTag = document.getElementById("new-version-tag");
    const updateProgressContainer = document.getElementById("update-progress-container");
    const updateProgressBar = document.getElementById("update-progress-bar");
    const updatePercent = document.getElementById("update-percent");
    const updateSpeed = document.getElementById("update-speed");
    const btnUpdateAction = document.getElementById("btn-update-action");
    const updateDesc = document.getElementById("update-desc");

    // 1. Yangi versiya aniqlanganda (modal ochiladi va yangilashni talab qiladi)
    if (typeof window.electronAPI.onUpdateAvailable === "function") {
        window.electronAPI.onUpdateAvailable((info) => {
            console.log("🚀 Yangi versiya topildi:", info.version);
            if (newVersionTag) newVersionTag.textContent = "v" + info.version;
            if (updateModal) updateModal.classList.add("active");
        });
    }

    // 2. Foydalanuvchi "Hozir yangilash" tugmasini bosganda
    if (btnUpdateAction) {
        btnUpdateAction.addEventListener("click", async () => {
            if (btnUpdateAction.getAttribute("data-status") === "downloaded") {
                // Agar yuklab olingan bo'lsa, o'rnatish
                window.electronAPI.installUpdate();
                return;
            }

            btnUpdateAction.disabled = true;
            btnUpdateAction.textContent = "Yuklab olinmoqda...";
            if (updateProgressContainer) updateProgressContainer.style.display = "block";

            try {
                await window.electronAPI.startDownloadUpdate();
            } catch (err) {
                console.error("Yuklash xatosi:", err);
                btnUpdateAction.disabled = false;
                btnUpdateAction.textContent = "Qayta urinish";
            }
        });
    }

    // 3. Yuklanish jarayoni (Progress bar)
    if (typeof window.electronAPI.onUpdateProgress === "function") {
        window.electronAPI.onUpdateProgress((progressObj) => {
            const percent = Math.round(progressObj.percent || 0);
            if (updateProgressBar) updateProgressBar.style.width = percent + "%";
            if (updatePercent) updatePercent.textContent = percent + "%";

            const speedKb = Math.round((progressObj.bytesPerSecond || 0) / 1024);
            if (updateSpeed) {
                updateSpeed.textContent = speedKb > 1024 
                    ? (speedKb / 1024).toFixed(1) + " MB/s" 
                    : speedKb + " KB/s";
            }
        });
    }

    // 4. Yuklab bo'lingach
    if (typeof window.electronAPI.onUpdateDownloaded === "function") {
        window.electronAPI.onUpdateDownloaded((info) => {
            console.log("✅ Yangilanish to'liq yuklab olindi:", info.version);
            if (updateDesc) {
                updateDesc.innerHTML = `Yangi versiya (<b>v${info.version}</b>) muvaffaqiyatli yuklandi!<br/>O‘rnatish uchun quyidagi tugmani bosing:`;
            }
            if (updateProgressContainer) updateProgressContainer.style.display = "none";
            if (btnUpdateAction) {
                btnUpdateAction.disabled = false;
                btnUpdateAction.setAttribute("data-status", "downloaded");
                btnUpdateAction.textContent = "O‘rnatish va qayta ishga tushirish";
                btnUpdateAction.style.background = "linear-gradient(135deg, #16a34a, #15803d)";
            }
        });
    }

    // 5. Xatolik yuz berganda
    if (typeof window.electronAPI.onUpdateError === "function") {
        window.electronAPI.onUpdateError((err) => {
            console.warn("Update xatosi:", err);
        });
    }
}