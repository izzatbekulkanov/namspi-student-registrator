# NamSPI Registrator — Electronic Queue & Registration Management Ecosystem

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)
![Django](https://img.shields.io/badge/django-5.0%2B-green.svg)
![Electron](https://img.shields.io/badge/electron-desktop-47848F.svg)
![WebSockets](https://img.shields.io/badge/websockets-channels-informational.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**NamSPI Registrator** — Namangan Davlat Pedagogika Instituti (NamDPI) uchun ishlab chiqilgan kompleks elektron navbat, talaba va xodimlarga xizmat ko'rsatishni boshqarish axborot tizimi. Tizim real-vaqt rejimida WebSockets orqali sinxronlashuvchi backend, katta zallar uchun elektron tablo/monitor hamda chipta chop etuvchi kiosk terminallarini o'z ichiga oladi.

---

## 🌟 Tizim Arxitekturasi va Modullari

Loyiha 3 ta asosiy mustaqil va bir-biri bilan integratsiyalashgan moduldan tashkil topgan:

```
NamSPI_REGISTRATOR/
├── Register/          # 1. Django + Channels ASGI Markaziy Boshqaruv Serveri
├── public-display/    # 2. Katta zal monitori / TV Tablo ilovasi (Electron.js)
└── register_exe/      # 3. Chipta olish Kioski va Termoprinter ilovasi (Electron.js)
```

---

### 1. 🏛️ Markaziy Boshqaruv Serveri (`Register/`)
- **Real-vaqt sinxronizatsiyasi:** `Django Channels` va `Daphne ASGI` orqali operatorlar va kutish monitorlari o'rtasida 0 kechikishli WebSocket aloqasi.
- **Zamonaviy PRO Dashboard:** Operator va administratorlar uchun qulay 2 ustunli boshqaruv paneli, interaktiv kartalar va statistik hisobotlar.
- **Xizmatlarni taqsimlash:** Xodimlarni kerakli xizmat turlariga biriktirish (bulk service assignment), xizmat ko'rsatish vaqtlarini tahlil qilish.
- **Statistika & Analitika:** Yakunlangan, rad etilgan va kutilayotgan navbatlar dinamikasi.
- **API qatlami:** REST API orqali tashqi qurilmalar va kiosklar bilan xavfsiz integratsiya.

---

### 2. 📺 Kutish Zali Monitori (`public-display/`)
- **Electron.js** asosidagi desktop / Smart TV monitor ilovasi.
- Xizmat ko'rsatilayotgan chiptalarni joriy oyna raqamlari bilan real-vaqtda chiroyli vizual ko'rsatish.
- **🎙️ Ovozli chaqiruv tizimi:** Chipta chaqirilganda o'zbek tilida avtomatik ovozli e'lon qilish (*"A-012 raqamli chipta egasi, 3-oynaga marhamat qiling"*).
- Aloqa uzilganda avtomatik qayta ulanish (Auto Reconnect) va oflayn xavfsizlik.

---

### 3. 🖨️ Kiosk Terminali (`register_exe/`)
- Tashrif buyuruvchilar sensorli ekran orqali kerakli bo'lim yoki xizmat turini tanlaydi.
- **Termoprinter integratsiyasi:** ESC/POS printeri orqali navbat raqami, sana/vaqt, xizmat turi va QR-kod bilan tezkor chipta chop etish.
- To'liq ekran (Kiosk Mode) xavfsizlik rejimida ishlash.

---

## 🛠️ Texnologiyalar Steki

| Qism | Texnologiyalar |
| :--- | :--- |
| **Backend & API** | Python 3.10+, Django 5.x, Django REST Framework, Daphne (ASGI) |
| **Real-Time Engine** | Django Channels, WebSockets, Redis / In-Memory Channel Layer |
| **Boshqaruv Paneli** | HTML5, Bootstrap 5 / PRO UI, JavaScript ES6, SweetAlert2 |
| **Desktop Ilovalar** | Electron.js, Node.js, HTML5/CSS3, ESC/POS Printer API |
| **Ma'lumotlar Bazasi** | SQLite3 / PostgreSQL |
| **Ovoz Sintezi (TTS)**| Edge Neural TTS Engine (Uzbek Voice) |

---

## 🚀 O'rnatish va Ishga Tushirish

### 1. Backend Serverni ishga tushirish (`Register/`)

```bash
cd Register
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput

# Daphne ASGI serverini ishga tushirish (Port: 8001)
daphne -b 0.0.0.0 -p 8001 core.asgi:application
```

### 2. Monitor Tablosini ishga tushirish (`public-display/`)

```bash
cd ../public-display
npm install
npm start

# Windows uchun o'rnatuvchi fayl (.exe) yaratish:
npm run build
```

### 3. Kiosk Terminalini ishga tushirish (`register_exe/`)

```bash
cd ../register_exe
npm install
npm start

# Kiosk dasturini build qilish:
npm run build
```

---

## 📄 Litsenziya

Ushbu loyiha [MIT](LICENSE) litsenziyasi asosida himoyalangan.
