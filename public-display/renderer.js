// === public-display/renderer.js ===

const DEFAULT_API_URL = "https://navbat.namspi.uz/api/tickets/serving/";
let currentApiUrl = localStorage.getItem("API_URL") || DEFAULT_API_URL;

// Oldingi navbatlarni saqlash va yangi navbatlarni aniqlash
let announcedTicketIds = new Set();
let isFirstLoad = true;

// E’lonlar navbati (Audio / Visual Queue)
let announcementQueue = [];
let isAnnouncing = false;

// API manzilini qayta yuklash
window.reloadApiUrl = function() {
    currentApiUrl = localStorage.getItem("API_URL") || DEFAULT_API_URL;
    fetchServingTickets();
};

// API holati indikatorini yangilash
function updateApiStatus(isOnline, message = "") {
    const statusEl = document.getElementById("apiStatus");
    const statusTextEl = document.getElementById("apiStatusText");
    if (!statusEl || !statusTextEl) return;

    if (isOnline) {
        statusEl.className = "status-badge status-online";
        statusTextEl.textContent = message || "Bog‘langan";
    } else {
        statusEl.className = "status-badge status-offline";
        statusTextEl.textContent = message || "Ulanishda xato";
    }
}

// Chipta ma'lumotlarini serverdan yuklash
async function fetchServingTickets() {
    const tbody = document.getElementById("ticket-body");
    if (!tbody) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(currentApiUrl, {
            signal: controller.signal,
            headers: { "Accept": "application/json" }
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`HTTP xatolik: ${res.status}`);
        }

        const data = await res.json();
        updateApiStatus(true, "Jonli");

        // Har xil API formatlarini qo'llab-quvvatlash
        const tickets = data.serving_tickets || data.tickets || (Array.isArray(data) ? data : []);

        // Yangi chaqirilgan chiptalarni aniqlash
        if (isFirstLoad) {
            // Dastur birinchi ochilganda bor navbatlarni faqat ro'yxatga olamiz (barchasini birdaniga e'lon qilmaslik uchun)
            tickets.forEach(ticket => {
                const key = String(ticket.id || ticket.ticket_number);
                announcedTicketIds.add(key);
            });
            isFirstLoad = false;
        } else {
            // Yangi kelgan chiptalarni topish
            const newTickets = tickets.filter(ticket => {
                const key = String(ticket.id || ticket.ticket_number);
                return !announcedTicketIds.has(key);
            });

            if (newTickets.length > 0) {
                newTickets.forEach(t => {
                    const key = String(t.id || t.ticket_number);
                    announcedTicketIds.add(key);
                    announcementQueue.push(t);
                });

                if (!isAnnouncing) {
                    processNextAnnouncement();
                }
            }
        }

        // Jadvalni to'ldirish
        renderTicketTable(tickets);

    } catch (error) {
        console.error("❌ API xatolik:", error);
        updateApiStatus(false, "Aloqa uzildi");

        // Agar jadval bo'sh bo'lsa xatolik xabarini ko'rsatish
        if (tbody.children.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="2" class="empty-state">
                        <span class="empty-icon">⚠️</span>
                        Server bilan bog‘lanib bo‘lmadi.<br>
                        <small style="font-size: 14px; opacity: 0.8;">Qayta ulanish kutilmoqda...</small>
                    </td>
                </tr>
            `;
        }
    }
}

// Jadvalni chizish funksiyasi
function renderTicketTable(tickets) {
    const tbody = document.getElementById("ticket-body");
    if (!tbody) return;

    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="2" class="empty-state">
                    <span class="empty-icon">⏳</span>
                    Hozircha xizmat ko‘rsatilayotgan navbatlar yo‘q
                </td>
            </tr>
        `;
        return;
    }

    let html = "";
    tickets.forEach(ticket => {
        const ticketNum = String(ticket.ticket_number || "").padStart(4, "0");
        const windowNum = ticket.window_number ? `${ticket.window_number} - oyna` : "—";
        const ticketId = ticket.id || ticket.ticket_number;

        html += `
            <tr id="row-ticket-${ticketId}">
                <td class="ticket-cell">${ticketNum}</td>
                <td><span class="window-pill">${windowNum}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Ketma-ket audio ijro qilish funksiyasi
function playAudioSequence(audioPaths, onComplete) {
    if (!audioPaths || audioPaths.length === 0) {
        if (typeof onComplete === "function") onComplete();
        return;
    }

    const currentSrc = audioPaths[0];
    const remaining = audioPaths.slice(1);
    const audio = new Audio(currentSrc);

    audio.onended = () => {
        playAudioSequence(remaining, onComplete);
    };

    audio.onerror = (e) => {
        console.warn(`Audio yuklanmadi: ${currentSrc}`, e);
        playAudioSequence(remaining, onComplete);
    };

    audio.play().catch(err => {
        console.warn("Audio ijro xatosi:", err);
        playAudioSequence(remaining, onComplete);
    });
}

// Navbatdagi e'lonni boshqarish
function processNextAnnouncement() {
    if (announcementQueue.length === 0) {
        isAnnouncing = false;
        return;
    }

    isAnnouncing = true;
    const ticket = announcementQueue.shift();

    const announcementEl = document.getElementById("announcement");
    const ticketEl = document.getElementById("announcement-ticket");
    const windowEl = document.getElementById("announcement-window");

    const ticketNumStr = String(ticket.ticket_number || "").padStart(4, "0");
    const windowNum = ticket.window_number || "";

    if (ticketEl) ticketEl.textContent = ticketNumStr;
    if (windowEl) windowEl.textContent = windowNum ? `${windowNum} - oyna` : "Xizmat oynasi";

    // Jadvaldagi qatorni ajratib ko'rsatish
    const ticketId = ticket.id || ticket.ticket_number;
    const rowEl = document.getElementById(`row-ticket-${ticketId}`);
    if (rowEl) rowEl.classList.add("row-active");

    // E'lon oynasini ko'rsatish
    if (announcementEl) announcementEl.classList.add("active");

    const speechText = `${ticketNumStr} - raqamli navbat egasi, ${windowNum ? windowNum + ' - ' : ''}oynaga marhamat!`;

    // 1. Ding-dong
    const dingDong = new Audio("assets/sound/ding-dong.mp3");
    dingDong.play().catch(() => {});

    function playRecordedVoiceSequence() {
        const audioQueue = [];
        audioQueue.push("assets/sound/ding-dong.mp3");

        for (let char of ticketNumStr) {
            audioQueue.push(`assets/voice/${char}.mp3`);
        }
        audioQueue.push("assets/voice/inchi_raqam_iltimos.mp3");

        if (windowNum) {
            for (let char of String(windowNum)) {
                audioQueue.push(`assets/voice/${char}.mp3`);
            }
            audioQueue.push("assets/voice/inchi_oynaga_boring.mp3");
        }

        playAudioSequence(audioQueue, finishAnnouncement);
    }

    function finishAnnouncement() {
        setTimeout(() => {
            if (announcementEl) announcementEl.classList.remove("active");
            if (rowEl) rowEl.classList.remove("row-active");

            setTimeout(() => {
                processNextAnnouncement();
            }, 800);
        }, 1500);
    }

    // 2. Edge Madina TTS
    let ttsStarted = false;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(speechText);
            utterance.lang = 'uz-UZ';
            utterance.rate = 0.92;
            utterance.pitch = 1.0;

            const voices = window.speechSynthesis.getVoices();
            const madinaVoice = voices.find(v =>
                v.name.includes('Madina') || v.name.includes('uz-UZ') || v.lang === 'uz-UZ' || v.lang === 'uz_UZ'
            );
            if (madinaVoice) utterance.voice = madinaVoice;

            utterance.onend = finishAnnouncement;
            utterance.onerror = () => {
                playRecordedVoiceSequence();
            };

            window.speechSynthesis.speak(utterance);
        }, 400);
        ttsStarted = true;
    }

    if (!ttsStarted) {
        playRecordedVoiceSequence();
    }
}

// Boshlang'ich yuklash va 3 soniyali davriy so'rov
document.addEventListener("DOMContentLoaded", () => {
    fetchServingTickets();
    setInterval(fetchServingTickets, 3000);
});