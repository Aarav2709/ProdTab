// History page JavaScript for MoodsWeb extension
let allEntries = [];
let filteredEntries = [];

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

// Initialize the history page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeHistoryPage();
});

// Main initialization function
async function initializeHistoryPage() {
    await loadSavedTheme();
    await loadAllEntries();
    calculateStats();
    displayEntries();
    setupEventListeners();
}

// Load saved theme preference
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

// Update theme icon
function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Toggle theme
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

// Load all entries from storage
async function loadAllEntries() {
    try {
        const result = await storageAPI.local.get(['entries']);
        allEntries = result.entries || [];
        filteredEntries = [...allEntries];

        // Sort entries by timestamp (newest first)
        allEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        filteredEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    } catch (error) {
        console.error('Error loading entries:', error);
        allEntries = [];
        filteredEntries = [];
    }
}// Calculate and display statistics
function calculateStats() {
    const totalEntries = allEntries.length;

    // Calculate unique days with entries
    const uniqueDates = new Set(allEntries.map(entry => entry.date));
    const daysActive = uniqueDates.size;

    // Calculate current streak
    const currentStreak = calculateCurrentStreak();

    // Update DOM
    document.getElementById('total-entries').textContent = totalEntries;
    document.getElementById('current-streak').textContent = currentStreak;
    document.getElementById('days-active').textContent = daysActive;
}

// Calculate current streak of consecutive days
function calculateCurrentStreak() {
    if (allEntries.length === 0) return 0;

    // Get unique dates sorted from newest to oldest
    const uniqueDates = [...new Set(allEntries.map(entry => entry.date))].sort((a, b) => b.localeCompare(a));

    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let currentDate = new Date(today);

    // Start checking from today or the most recent entry date
    const startDate = uniqueDates.includes(today) ? today : uniqueDates[0];
    currentDate = new Date(startDate);

    // Count consecutive days
    for (let i = 0; i < uniqueDates.length; i++) {
        const dateString = currentDate.toISOString().split('T')[0];

        if (uniqueDates.includes(dateString)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

// Display entries grouped by date
function displayEntries() {
    const container = document.getElementById('entries-container');
    const noEntriesElement = document.getElementById('no-entries');

    if (filteredEntries.length === 0) {
        container.innerHTML = '';
        noEntriesElement.style.display = 'block';
        return;
    }

    noEntriesElement.style.display = 'none';

    // Group entries by date
    const entriesByDate = groupEntriesByDate(filteredEntries);

    // Create HTML for each date group
    const html = Object.keys(entriesByDate)
        .sort((a, b) => b.localeCompare(a)) // Sort dates newest first
        .map(date => createDateGroupHTML(date, entriesByDate[date]))
        .join('');

    container.innerHTML = html;
}

// Group entries by date
function groupEntriesByDate(entries) {
    return entries.reduce((groups, entry) => {
        const date = entry.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(entry);
        return groups;
    }, {});
}

// Create HTML for a date group
function createDateGroupHTML(date, entries) {
    const formattedDate = formatDateForDisplay(date);
    const entriesHTML = entries
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(entry => createEntryHTML(entry))
        .join('');

    return `
        <div class="date-group">
            <div class="date-header">
                ${formattedDate}
            </div>
            <div class="entries-for-date">
                ${entriesHTML}
            </div>
        </div>
    `;
}

// Create HTML for a single entry
function createEntryHTML(entry) {
    const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    return `
        <div class="history-entry">
            <div class="entry-meta">
                <span class="entry-time">${time}</span>
            </div>
            <div class="entry-question">"${entry.question}"</div>
            <div class="entry-reflection">${escapeHtml(entry.reflection)}</div>
        </div>
    `;
}

// Format date for display
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const todayString = today.toISOString().split('T')[0];
    const yesterdayString = yesterday.toISOString().split('T')[0];

    if (dateString === todayString) {
        return 'Today';
    } else if (dateString === yesterdayString) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Export buttons
    document.getElementById('export-json').addEventListener('click', exportAsJSON);
    document.getElementById('export-txt').addEventListener('click', exportAsText);

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', handleSearch);
}// Handle search functionality
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();

    if (!searchTerm) {
        filteredEntries = [...allEntries];
    } else {
        filteredEntries = allEntries.filter(entry => {
            return entry.reflection.toLowerCase().includes(searchTerm) ||
                   entry.question.toLowerCase().includes(searchTerm);
        });
    }

    displayEntries();
}

// Export entries as JSON
function exportAsJSON() {
    try {
        const exportData = {
            exportDate: new Date().toISOString(),
            totalEntries: allEntries.length,
            entries: allEntries
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const fileName = `moodsweb-reflections-${new Date().toISOString().split('T')[0]}.json`;

        downloadFile(jsonString, fileName, 'application/json');

    } catch (error) {
        console.error('Error exporting as JSON:', error);
        alert('Failed to export data as JSON. Please try again.');
    }
}

// Export entries as text
function exportAsText() {
    try {
        let textContent = `MoodsWeb - Reflection Export\n`;
        textContent += `Export Date: ${new Date().toLocaleDateString('en-US')}\n`;
        textContent += `Total Reflections: ${allEntries.length}\n`;
        textContent += `${'='.repeat(50)}\n\n`;

        // Group entries by date for text export
        const entriesByDate = groupEntriesByDate(allEntries);
        const sortedDates = Object.keys(entriesByDate).sort((a, b) => a.localeCompare(b));

        sortedDates.forEach(date => {
            const formattedDate = new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            textContent += `${formattedDate}\n`;
            textContent += `${'-'.repeat(formattedDate.length)}\n`;

            const entriesForDate = entriesByDate[date].sort((a, b) =>
                new Date(a.timestamp) - new Date(b.timestamp)
            );

            entriesForDate.forEach((entry, index) => {
                const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });

                textContent += `\\n[${time}] ${entry.question}\\n`;
                textContent += `${entry.reflection}\\n`;

                if (index < entriesForDate.length - 1) {
                    textContent += `\\n`;
                }
            });

            textContent += `\\n\\n`;
        });

        const fileName = `moodsweb-reflections-${new Date().toISOString().split('T')[0]}.txt`;
        downloadFile(textContent, fileName, 'text/plain');

    } catch (error) {
        console.error('Error exporting as text:', error);
        alert('Failed to export data as text. Please try again.');
    }
}

// Download file utility function
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Export functions for potential debugging
window.MoodsWebHistory = {
    allEntries,
    filteredEntries,
    loadAllEntries,
    exportAsJSON,
    exportAsText,
    calculateStats
};
