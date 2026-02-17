# Life OS Dashboard

A personal productivity dashboard for tracking habits, study progress, and daily routines.

**Live Demo:** https://cyprianokoli.github.io/life-os-demo-Dashboard

> 🎮 This is a **demo version** with sample data to showcase the features.

## Features

- 📊 **90-Day Challenge Tracker** - Visualize long-term goals
- 🔥 **Streak Counter** - Track daily habits (Network+, French, Gym)
- 📅 **Daily Schedule** - Routine tracking with sub-tasks
- 🧠 **Spaced Repetition** - Study review system using SM-2 algorithm
- 📖 **Journal** - Daily reflection logging
- 🤖 **AI Assistant** - Quick help via floating chat button
- ☁️ **Cloud Sync** - Optional backend for data backup

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript, CSS3, HTML5 |
| Backend | Node.js, Express |
| Data | localStorage with cloud sync fallback |
| Hosting | GitHub Pages (frontend) |
| PWA | Service Worker, Web App Manifest |

## Key Design Decisions

### 1. Offline-First
The app works without internet. Data is stored locally and syncs to the cloud when connected. This means:
- No loading spinners
- Works on the subway, planes, anywhere
- Faster than server-rendered apps

### 2. Three-Tab Architecture
Instead of one cluttered page:
- **Home** - Today's essentials only
- **Stats** - Progress tracking and history
- **Settings** - Configuration and data management

### 3. Service Worker Strategy
Learned the hard way: cache-first breaks SPAs. Implemented network-first for HTML, cache-first for assets.

## Running Locally

```bash
# Clone the repo
git clone https://github.com/cyprianokoli/life-os-demo-Dashboard.git
cd life-os-demo-Dashboard

# Start a local server
python3 -m http.server 8080

# Open http://localhost:8080
```

## File Structure

```
life-os-demo-Dashboard/
├── index.html          # Main page (daily essentials)
├── stats.html          # Progress tracking
├── settings.html       # Configuration
├── server.js           # Optional local backend
├── service-worker.js   # PWA offline support
├── manifest.json       # PWA manifest
└── README.md
```

## Lessons Learned

1. **Service Worker Strategy Matters**
   - Cache-first broke navigation between pages
   - Network-first for HTML, cache-first for assets = ✓

2. **Offline-First Design**
   - Assume backend is offline
   - Queue changes, sync when connected
   - Better UX than "loading..." spinners

3. **Constraint = Clarity**
   - Forced "essentials only" on main screen
   - Moved everything else to dedicated pages
   - Result: cleaner, faster, more focused

## Push Notifications

**Status:** Supported but not yet enabled

**Requirements:**
- ✅ Android (Chrome) - Full support
- ⚠️ iOS (Safari 16.4+) - Only works when added to home screen
- ❌ Requires backend server to send notifications

## Roadmap

- [ ] Native app wrapper (Capacitor)
- [ ] Push notifications for study reminders
- [ ] Database backend (PostgreSQL)
- [ ] Multi-device sync
- [ ] Analytics dashboard
- [ ] Voice input for adding tasks

## 90-Day Challenge

| Phase | Days | Goal | Status |
|-------|------|------|--------|
| 1 | 1-30 | Network+ Cert | In Progress |
| 2 | 31-60 | Security+ Cert | Planned |
| 3 | 61-90 | Real Estate App MVP | Planned |

---

Built with 💪 during a 90-day certification challenge.

#buildinpublic #webdev #productivity #pwa #javascript
