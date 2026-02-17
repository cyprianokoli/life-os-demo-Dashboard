const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Data file helpers
const getDataFile = (userId) => path.join(DATA_DIR, `${userId}.json`);

const loadData = (userId) => {
    const file = getDataFile(userId);
    if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    return {
        userId,
        createdAt: new Date().toISOString(),
        tasks: {},
        journal: [],
        studyTopics: [],
        streaks: {},
        studySessions: [],
        settings: {},
        aiChat: []
    };
};

const saveData = (userId, data) => {
    fs.writeFileSync(getDataFile(userId), JSON.stringify(data, null, 2));
};

// Default user (for single-user setup)
const DEFAULT_USER = 'junior';

// ===== API ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all data
app.get('/api/data', (req, res) => {
    const data = loadData(DEFAULT_USER);
    res.json(data);
});

// Update tasks
app.post('/api/tasks', (req, res) => {
    const data = loadData(DEFAULT_USER);
    data.tasks = { ...data.tasks, ...req.body };
    data.updatedAt = new Date().toISOString();
    saveData(DEFAULT_USER, data);
    res.json({ success: true, tasks: data.tasks });
});

// Add journal entry
app.post('/api/journal', (req, res) => {
    const data = loadData(DEFAULT_USER);
    const entry = {
        id: Date.now().toString(),
        text: req.body.text,
        date: new Date().toISOString()
    };
    data.journal.unshift(entry);
    data.updatedAt = new Date().toISOString();
    saveData(DEFAULT_USER, data);
    res.json({ success: true, entry });
});

// Add study topic
app.post('/api/study-topics', (req, res) => {
    const data = loadData(DEFAULT_USER);
    const topic = {
        id: 'sr-' + Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    data.studyTopics.push(topic);
    data.updatedAt = new Date().toISOString();
    saveData(DEFAULT_USER, data);
    res.json({ success: true, topic });
});

// Update study topic (for reviews)
app.put('/api/study-topics/:id', (req, res) => {
    const data = loadData(DEFAULT_USER);
    const index = data.studyTopics.findIndex(t => t.id === req.params.id);
    if (index !== -1) {
        data.studyTopics[index] = { ...data.studyTopics[index], ...req.body };
        data.updatedAt = new Date().toISOString();
        saveData(DEFAULT_USER, data);
        res.json({ success: true, topic: data.studyTopics[index] });
    } else {
        res.status(404).json({ error: 'Topic not found' });
    }
});

// Log streak
app.post('/api/streaks', (req, res) => {
    const data = loadData(DEFAULT_USER);
    const { type, date } = req.body;
    if (!data.streaks[type]) {
        data.streaks[type] = { current: 0, history: {} };
    }
    data.streaks[type].history[date || new Date().toISOString().split('T')[0]] = true;
    data.updatedAt = new Date().toISOString();
    saveData(DEFAULT_USER, data);
    res.json({ success: true, streaks: data.streaks });
});

// Log study session
app.post('/api/study-sessions', (req, res) => {
    const data = loadData(DEFAULT_USER);
    const session = {
        id: Date.now().toString(),
        ...req.body,
        timestamp: new Date().toISOString()
    };
    data.studySessions.push(session);
    data.updatedAt = new Date().toISOString();
    saveData(DEFAULT_USER, data);
    res.json({ success: true, session });
});

// AI Webhook endpoint
app.post('/api/ai', (req, res) => {
    const { message, context } = req.body;
    
    // Load user data for context-aware responses
    const data = loadData(DEFAULT_USER);
    
    // Generate response based on message content
    const lower = message.toLowerCase();
    let response = { text: "I received your message." };
    
    if (lower.includes('streak')) {
        const streaks = Object.entries(data.streaks)
            .map(([type, s]) => `${type}: ${s.current || 0} days`)
            .join(', ');
        response.text = streaks ? `Current streaks: ${streaks}` : "No active streaks yet. Start logging!";
    }
    else if (lower.includes('study') || lower.includes('network')) {
        const topics = data.studyTopics.length;
        const due = data.studyTopics.filter(t => new Date(t.nextReview) <= new Date()).length;
        response.text = `You have ${topics} study topics, ${due} due for review.`;
    }
    else if (lower.includes('journal') || lower.includes('entry')) {
        response.text = `You have ${data.journal.length} journal entries.`;
    }
    else if (lower.includes('progress')) {
        const sessions = data.studySessions.length;
        const hours = data.studySessions.reduce((sum, s) => sum + (s.hours || 0), 0);
        response.text = `Study progress: ${sessions} sessions, ${Math.round(hours * 10) / 10} total hours.`;
    }
    else if (lower.includes('task') || lower.includes('add')) {
        response.text = "I can add tasks to your study queue. What topic would you like to add?";
        response.suggestTask = true;
    }
    else if (lower.includes('hello') || lower.includes('hi')) {
        response.text = "Hey Junior. What do you need?";
    }
    else {
        response.text = `You've completed ${Object.values(data.tasks).filter(t => t).length} tasks today. Keep it up!`;
    }
    
    // Save chat history
    data.aiChat.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
    data.aiChat.push({ role: 'assistant', content: response.text, timestamp: new Date().toISOString() });
    if (data.aiChat.length > 50) data.aiChat = data.aiChat.slice(-50);
    data.updatedAt = new Date().toISOString();
    saveData(DEFAULT_USER, data);
    
    res.json(response);
});

// Get AI chat history
app.get('/api/ai/chat', (req, res) => {
    const data = loadData(DEFAULT_USER);
    res.json({ messages: data.aiChat.slice(-20) });
});

// Sync endpoint (for batch updates)
app.post('/api/sync', (req, res) => {
    const data = loadData(DEFAULT_USER);
    const updates = req.body;
    
    // Merge updates
    if (updates.tasks) data.tasks = { ...data.tasks, ...updates.tasks };
    if (updates.journal) data.journal = [...updates.journal, ...data.journal].slice(0, 100);
    if (updates.streaks) data.streaks = { ...data.streaks, ...updates.streaks };
    
    data.updatedAt = new Date().toISOString();
    data.lastSync = new Date().toISOString();
    saveData(DEFAULT_USER, data);
    
    res.json({ success: true, lastSync: data.lastSync, data });
});

// Backup endpoint
app.get('/api/backup', (req, res) => {
    const data = loadData(DEFAULT_USER);
    res.setHeader('Content-Disposition', `attachment; filename="dashboard-backup-${new Date().toISOString().split('T')[0]}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
});

// Restore endpoint
app.post('/api/restore', (req, res) => {
    try {
        const backup = req.body;
        backup.restoredAt = new Date().toISOString();
        saveData(DEFAULT_USER, backup);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Invalid backup data' });
    }
});

// Catch all - serve index.html for SPA routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Dashboard server running on http://localhost:${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
});
