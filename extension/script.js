// Predefined reflection questions
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

// Global variables
let currentQuestion = '';
let currentDate = '';

// Browser API compatibility
const storageAPI = (() => {
    if (typeof browser !== 'undefined' && browser.storage) {
        return browser.storage;
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
        return chrome.storage;
    } else {
        // Fallback to localStorage with promise-like interface
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

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeExtension();
});

// Main initialization function
function initializeExtension() {
    setCurrentDate();
    loadDailyQuestion();
    loadTodayEntries();
    setupEventListeners();
}

// Set the current date display
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

// Load and display the daily question
function loadDailyQuestion() {
    // Use date as seed to get consistent question for the day
    const questionIndex = getQuestionIndexForDate(currentDate);
    currentQuestion = REFLECTION_QUESTIONS[questionIndex];

    document.getElementById('daily-question').textContent = currentQuestion;
}

// Get question index based on date (ensures same question all day)
function getQuestionIndexForDate(dateString) {
    // Simple hash function to get consistent index for date
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % REFLECTION_QUESTIONS.length;
}

// Set up event listeners
function setupEventListeners() {
    const saveButton = document.getElementById('save-button');
    const clearButton = document.getElementById('clear-button');
    const textArea = document.getElementById('reflection-input');

    saveButton.addEventListener('click', saveReflection);
    clearButton.addEventListener('click', clearInput);

    // Auto-save while typing (debounced)
    let saveTimeout;
    textArea.addEventListener('input', function() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (textArea.value.trim()) {
                showStatus('Auto-saving...', 'info');
            }
        }, 2000);
    });

    // Save on Enter + Ctrl/Cmd
    textArea.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            saveReflection();
        }
    });
}

// Save reflection entry
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
        // Get existing entries
        const result = await storageAPI.local.get(['entries']);
        const entries = result.entries || [];

        // Add new entry
        entries.push(entry);

        // Save back to storage
        await storageAPI.local.set({ entries: entries });

        showStatus('Reflection saved! ✨', 'success');
        input.value = '';

        // Refresh today's entries display
        loadTodayEntries();

    } catch (error) {
        console.error('Error saving reflection:', error);
        showStatus('Failed to save reflection. Please try again.', 'error');
    }
}

// Clear the input
function clearInput() {
    const input = document.getElementById('reflection-input');
    input.value = '';
    showStatus('Input cleared.', 'info');
    input.focus();
}

// Show status message
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('save-status');
    statusElement.textContent = message;
    statusElement.className = `save-status ${type}`;

    // Clear status after 3 seconds
    setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'save-status';
    }, 3000);
}

// Load and display today's entries
async function loadTodayEntries() {
    try {
        const result = await storageAPI.local.get(['entries']);
        const entries = result.entries || [];

        // Filter entries for today
        const todayEntries = entries.filter(entry => entry.date === currentDate);

        const todayEntriesContainer = document.getElementById('today-entries');

        if (todayEntries.length === 0) {
            todayEntriesContainer.innerHTML = '';
            return;
        }

        // Sort by timestamp (newest first)
        todayEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Create HTML for today's entries
        const entriesHTML = `
            <div class="today-section">
                <h3>Today's Reflections</h3>
                ${todayEntries.map(entry => `
                    <div class="entry-preview">
                        <div class="entry-time">
                            ${new Date(entry.timestamp).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                            })}
                        </div>
                        <div class="entry-text">
                            ${entry.reflection.length > 100
                                ? entry.reflection.substring(0, 100) + '...'
                                : entry.reflection}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        todayEntriesContainer.innerHTML = entriesHTML;

    } catch (error) {
        console.error('Error loading today\'s entries:', error);
    }
}

// Utility function to format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Export functions for potential use in other files
window.MoodsWeb = {
    REFLECTION_QUESTIONS,
    saveReflection,
    clearInput,
    loadTodayEntries
};
