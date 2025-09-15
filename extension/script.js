// Predefined reflection questions.
const REFLECTION_QUESTIONS = [
    "What are you grateful for today?",
    "What's on your mind?",
    "What's one small win you had today?",
    "How are you feeling right now?",
    "What challenged you today and how did you handle it?",
    "What made you smile today?",
    "What's something you learned about yourself recently?",
    "What are you looking forward to?",
    "What would you like to let go of?",
    "How did you show kindness today?",
    "What's something that inspired you lately?",
    "What progress did you make toward your goals?",
    "What would you tell your past self?",
    "What are you proud of accomplishing?",
    "How did you take care of yourself today?",
    "What connections did you make with others?",
    "What creative thoughts crossed your mind?",
    "What brought you peace today?",
    "What would you like to remember about today?",
    "How did you grow today?"
];

// Global variables.
let currentQuestion = '';
let currentDate = '';
let currentQuestionIndex = 0;
let currentXP = 0;
let currentLevel = 1;
let currentStreak = 0;
let lastEntryDate = '';

// Browser API compatibility.
const storageAPI = (() => {
    if (typeof browser !== 'undefined' && browser.storage) {
        return browser.storage;
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
        return chrome.storage;
    } else {
                                // Fallback to localStorage with promise-like interface.
        return {
            local: {
                get: (keys) => {
                    return new Promise((resolve) => {
                        const result = {};
                        if (Array.isArray(keys)) {
                            keys.forEach(key => {
                                const value = localStorage.getItem(key);
                                if (value) {
                                    try {
                                        result[key] = JSON.parse(value);
                                    } catch (e) {
                                        result[key] = value;
                                    }
                                }
                            });
                        } else if (typeof keys === 'object') {
                            Object.keys(keys).forEach(key => {
                                const value = localStorage.getItem(key);
                                if (value) {
                                    try {
                                        result[key] = JSON.parse(value);
                                    } catch (e) {
                                        result[key] = value;
                                    }
                                } else {
                                    result[key] = keys[key];
                                }
                            });
                        }
                        resolve(result);
                    });
                },
                set: (items) => {
                    return new Promise((resolve) => {
                        Object.keys(items).forEach(key => {
                            localStorage.setItem(key, JSON.stringify(items[key]));
                        });
                        resolve();
                    });
                }
            }
        };
    }
})();

// Initialize the extension when DOM is loaded.
document.addEventListener('DOMContentLoaded', function() {
    initializeExtension();
});

// Main initialization function.
function initializeExtension() {
    setCurrentDate();
    loadSavedTheme();
    loadDailyQuestion();
    loadXPAndStreak();
    loadTodayEntries();
    setupEventListeners();
}

// Load saved theme preference.
async function loadSavedTheme() {
    try {
        const result = await storageAPI.local.get(['theme']);
        const savedTheme = result.theme || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } catch (error) {
        console.error('Error loading theme:', error);
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

// Update theme icon.
function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Toggle theme.
async function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeIcon(newTheme);

    try {
        await storageAPI.local.set({ theme: newTheme });
    } catch (error) {
        console.error('Error saving theme:', error);
    }
}

// Set the current date display.
function setCurrentDate() {
    const now = new Date();
    currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    document.getElementById('current-date').textContent =
        now.toLocaleDateString('en-US', options);
}

// Load and display the daily question.
async function loadDailyQuestion() {
    try {
        // Get the current question index from storage or calculate based on date + entries
        const result = await storageAPI.local.get(['entries', 'lastQuestionDate', 'currentQuestionIndex']);
        const entries = result.entries || [];
        const lastQuestionDate = result.lastQuestionDate || '';
        let questionIndex = result.currentQuestionIndex || 0;

        // If it's a new day, reset to date-based question.
        if (lastQuestionDate !== currentDate) {
            questionIndex = getQuestionIndexForDate(currentDate);
            currentQuestionIndex = questionIndex;
            await storageAPI.local.set({
                lastQuestionDate: currentDate,
                currentQuestionIndex: questionIndex
            });
        } else {
            currentQuestionIndex = questionIndex;
        }

        currentQuestion = REFLECTION_QUESTIONS[currentQuestionIndex];
        document.getElementById('daily-question').textContent = currentQuestion;

    } catch (error) {
        console.error('Error loading question:', error);
        // Fallback to date-based question.
        const questionIndex = getQuestionIndexForDate(currentDate);
        currentQuestion = REFLECTION_QUESTIONS[questionIndex];
        document.getElementById('daily-question').textContent = currentQuestion;
    }
}

// Advance to next question.
async function advanceToNextQuestion() {
    currentQuestionIndex = (currentQuestionIndex + 1) % REFLECTION_QUESTIONS.length;
    currentQuestion = REFLECTION_QUESTIONS[currentQuestionIndex];

    // Update UI with animation.
    const questionElement = document.getElementById('daily-question');
    questionElement.style.opacity = '0';

    setTimeout(() => {
        questionElement.textContent = currentQuestion;
        questionElement.style.opacity = '1';
    }, 300);

    // Save the new question index.
    try {
        await storageAPI.local.set({
            currentQuestionIndex: currentQuestionIndex,
            lastQuestionDate: currentDate
        });
    } catch (error) {
        console.error('Error saving question index:', error);
    }
}// Get question index based on date (ensures same question all day).
function getQuestionIndexForDate(dateString) {
    // Simple hash function to get consistent index for date.
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer.
    }
    return Math.abs(hash) % REFLECTION_QUESTIONS.length;
}

// Set up event listeners.
function setupEventListeners() {
    const saveButton = document.getElementById('save-button');
    const clearButton = document.getElementById('clear-button');
    const themeToggle = document.getElementById('theme-toggle');
    const textArea = document.getElementById('reflection-input');

    saveButton.addEventListener('click', saveReflection);
    clearButton.addEventListener('click', clearInput);
    themeToggle.addEventListener('click', toggleTheme);

    // Auto-save while typing (debounced).
    let saveTimeout;
    textArea.addEventListener('input', function() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (textArea.value.trim()) {
                showStatus('Auto-saving.', 'info');
            }
        }, 2000);
    });

    // Save on Enter + Ctrl/Cmd.
    textArea.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            saveReflection();
        }
    });
}// Save reflection entry.
async function saveReflection() {
    const input = document.getElementById('reflection-input');
    const reflection = input.value.trim();

    if (!reflection) {
        showStatus('Please write something before saving.', 'error');
        return;
    }

    const entry = {
        id: Date.now().toString(),
        date: currentDate,
        timestamp: new Date().toISOString(),
        question: currentQuestion,
        reflection: reflection
    };

    try {
        // Get existing entries and XP/streak data.
        const result = await storageAPI.local.get(['entries', 'xp', 'level', 'streak', 'lastEntryDate']);
        const entries = result.entries || [];
        let xp = result.xp || 0;
        let level = result.level || 1;
        let streak = result.streak || 0;
        let lastDate = result.lastEntryDate || '';

        // Add new entry.
        entries.push(entry);

        // XP logic: +10 XP per entry, level up every 100 XP
        xp += 10;
        if (xp >= level * 100) {
            level += 1;
            showStatus('Level up! 🎉', 'success');
        }

        // Streak logic: +1 if yesterday or today, reset if gap
        const today = currentDate;
        let streakIncreased = false;
        if (lastDate) {
            const last = new Date(lastDate);
            const curr = new Date(today);
            const diff = (curr - last) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
                streak += 1;
                streakIncreased = true;
            } else if (diff === 0) {
                // Same day, streak unchanged
            } else {
                streak = 1;
                streakIncreased = true;
            }
        } else {
            streak = 1;
            streakIncreased = true;
        }

        // Save back to storage.
        await storageAPI.local.set({
            entries: entries,
            xp: xp,
            level: level,
            streak: streak,
            lastEntryDate: today
        });

        currentXP = xp;
        currentLevel = level;
        currentStreak = streak;
        lastEntryDate = today;
        updateXPStreakUI();

        showStatus('Reflection saved! ✨', 'success');
        if (streakIncreased && streak > 1) {
            showStatus(`Streak: ${streak} days! 🔥`, 'success');
        }
        input.value = '';

        // Refresh today's entries display.
        loadTodayEntries();

        // Advance to next question.
        setTimeout(() => {
            advanceToNextQuestion();
        }, 1500);

    } catch (error) {
        console.error('Error saving reflection:', error);
        showStatus('Failed to save reflection. Please try again.', 'error');
    }
}

// Clear the input.
function clearInput() {
    const input = document.getElementById('reflection-input');
    input.value = '';
    showStatus('Input cleared.', 'info');
    input.focus();
}

// Show status message.
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('save-status');
    statusElement.textContent = message;
    statusElement.className = `save-status ${type}`;

    // Clear status after 3 seconds.
    setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'save-status';
    }, 3000);
}

// Load and display today's entries.
async function loadTodayEntries() {
    try {
        const result = await storageAPI.local.get(['entries']);
        const entries = result.entries || [];

        // Filter entries for today.
        const todayEntries = entries.filter(entry => entry.date === currentDate);

        const todayEntriesContainer = document.getElementById('today-entries');

        if (todayEntries.length === 0) {
            todayEntriesContainer.textContent = '';
            return;
        }

        // Sort by timestamp (newest first).
        todayEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Create DOM elements safely for today's entries.
        const todaySection = document.createElement('div');
        todaySection.className = 'today-section';

        const heading = document.createElement('h3');
        heading.textContent = "Today's Reflections";
        todaySection.appendChild(heading);

        todayEntries.forEach(entry => {
            const entryPreview = document.createElement('div');
            entryPreview.className = 'entry-preview';

            const entryTime = document.createElement('div');
            entryTime.className = 'entry-time';
            entryTime.textContent = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });

            const entryText = document.createElement('div');
            entryText.className = 'entry-text';
            entryText.textContent = entry.reflection.length > 100
                ? entry.reflection.substring(0, 100) + '...'
                : entry.reflection;

            entryPreview.appendChild(entryTime);
            entryPreview.appendChild(entryText);
            todaySection.appendChild(entryPreview);
        });

        // Clear and add the new content.
        todayEntriesContainer.textContent = '';
        todayEntriesContainer.appendChild(todaySection);

    } catch (error) {
        console.error('Error loading today\'s entries:', error);
    }
}

// Utility function to format date for display.
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Export functions for potential use in other files.
window.MoodsWeb = {
    REFLECTION_QUESTIONS,
    saveReflection,
    clearInput,
    loadTodayEntries
};

// Load XP and streak from storage
async function loadXPAndStreak() {
    try {
        const result = await storageAPI.local.get(['xp', 'level', 'streak', 'lastEntryDate']);
        currentXP = result.xp || 0;
        currentLevel = result.level || 1;
        currentStreak = result.streak || 0;
        lastEntryDate = result.lastEntryDate || '';
        updateXPStreakUI();
    } catch (error) {
        currentXP = 0;
        currentLevel = 1;
        currentStreak = 0;
        lastEntryDate = '';
        updateXPStreakUI();
    }
}

// Update XP, level, and streak UI
function updateXPStreakUI() {
    const xpElem = document.getElementById('xp-value');
    const levelElem = document.getElementById('level-value');
    const streakElem = document.getElementById('streak-value');
    const xpMaxElem = document.getElementById('xp-max');
    if (levelElem) levelElem.textContent = currentLevel;
    if (xpElem && xpMaxElem) {
        const xpForLevel = currentLevel * 100;
        xpElem.textContent = currentXP % xpForLevel;
        xpMaxElem.textContent = xpForLevel;
    }
    if (streakElem) streakElem.textContent = currentStreak;
}
