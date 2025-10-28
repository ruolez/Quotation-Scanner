// Global state
let selectedUser = null;
let allUsers = [];
let recentScans = JSON.parse(localStorage.getItem('recentScans') || '[]');

// DOM Elements
const userList = document.getElementById('userList');
const selectedUserDisplay = document.getElementById('selectedUserDisplay');
const selectedUserName = document.getElementById('selectedUserName');
const quotationInput = document.getElementById('quotationInput');
const clearInputBtn = document.getElementById('clearInput');
const scanButton = document.getElementById('scanButton');
const btnText = document.querySelector('.btn-text');
const btnSpinner = document.querySelector('.btn-spinner');
const statusBanner = document.getElementById('statusBanner');
const recentScansSection = document.getElementById('recentScans');
const recentScansList = document.getElementById('recentScansList');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setupEventListeners();
    renderRecentScans();
});

// Load users from API
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const data = await response.json();

        if (data.success && data.users.length > 0) {
            allUsers = data.users.sort((a, b) => a.name.localeCompare(b.name));
            renderUsers(allUsers);
        } else {
            userList.innerHTML = '<p class="loading">No users found. Please add users in Settings.</p>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        userList.innerHTML = '<p class="loading error">Error loading users. Please check your connection.</p>';
    }
}

// Render users
function renderUsers(users) {
    userList.innerHTML = '';

    if (users.length === 0) {
        userList.innerHTML = '<p class="loading">No matching users found.</p>';
        return;
    }

    users.forEach(user => {
        const button = document.createElement('button');
        button.className = 'user-button';
        button.textContent = user.name;
        button.dataset.userId = user.id;
        button.dataset.userName = user.name;

        // Restore selection if this was the selected user
        if (selectedUser && selectedUser.id === user.id) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => selectUser(button, user));

        userList.appendChild(button);
    });
}

// Select user
function selectUser(button, user) {
    // Remove previous selection
    document.querySelectorAll('.user-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Add selection to clicked button
    button.classList.add('selected');
    selectedUser = user;

    // Show selected user display
    selectedUserDisplay.style.display = 'block';
    selectedUserName.textContent = user.name;

    // Enable input and focus
    quotationInput.disabled = false;
    scanButton.disabled = false;
    quotationInput.focus();

    // Clear status message
    hideStatus();
}

// Setup event listeners
function setupEventListeners() {
    // Clear input button
    quotationInput.addEventListener('input', (e) => {
        if (e.target.value.trim()) {
            clearInputBtn.style.display = 'flex';
        } else {
            clearInputBtn.style.display = 'none';
        }
    });

    clearInputBtn.addEventListener('click', () => {
        quotationInput.value = '';
        clearInputBtn.style.display = 'none';
        quotationInput.focus();
    });

    // Enter key on input
    quotationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !scanButton.disabled) {
            e.preventDefault();
            processScan();
        }
    });

    // Escape key to reset
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            resetForm();
        }
    });

    // Scan button click
    scanButton.addEventListener('click', processScan);

    // Dismiss status banner on click
    statusBanner.addEventListener('click', hideStatus);
}

// Reset form
function resetForm() {
    quotationInput.value = '';
    clearInputBtn.style.display = 'none';
    hideStatus();

    if (quotationInput.disabled) {
        quotationInput.focus();
    } else if (selectedUser) {
        quotationInput.focus();
    }
}

// Process scan
async function processScan() {
    const quotationNumber = quotationInput.value.trim();

    // Validate user selection
    if (!selectedUser) {
        showStatus('Please select a user first', 'error');
        setTimeout(() => {
            location.reload();
        }, 5000);
        return;
    }

    // Validate quotation number
    if (!quotationNumber) {
        showStatus('Please enter a quotation number', 'error');
        quotationInput.focus();
        setTimeout(() => {
            location.reload();
        }, 5000);
        return;
    }

    // Disable input during processing and show loading state
    quotationInput.disabled = true;
    scanButton.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';

    try {
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                quotation_number: quotationNumber,
                username: selectedUser.name
            })
        });

        const data = await response.json();

        // Reset button state
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';

        if (data.success) {
            // Add to recent scans
            addRecentScan(quotationNumber, data.scan_number);

            // Success
            const scanType = data.scan_number === 1 ? 'First' : 'Second';
            showStatus(
                `✓ ${scanType} scan successful! Quotation: ${quotationNumber} at ${data.timestamp}`,
                'success'
            );

            // Clear input
            quotationInput.value = '';
            clearInputBtn.style.display = 'none';

            // Reload page after 5 seconds
            setTimeout(() => {
                location.reload();
            }, 5000);
        } else {
            // Error from server
            showStatus(data.error || 'An error occurred', 'error');

            // Clear input
            quotationInput.value = '';
            clearInputBtn.style.display = 'none';

            // Reload page after 5 seconds
            setTimeout(() => {
                location.reload();
            }, 5000);
        }
    } catch (error) {
        console.error('Error processing scan:', error);
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        showStatus('Network error. Please check your connection and try again', 'error');

        // Clear input
        quotationInput.value = '';
        clearInputBtn.style.display = 'none';

        // Reload page after 5 seconds
        setTimeout(() => {
            location.reload();
        }, 5000);
    }
}

// Add recent scan to history
function addRecentScan(quotationNumber, scanNumber) {
    const scan = {
        quotation: quotationNumber,
        scanNumber: scanNumber,
        timestamp: new Date().toISOString(),
        user: selectedUser.name
    };

    // Add to beginning of array
    recentScans.unshift(scan);

    // Keep only last 5 scans
    recentScans = recentScans.slice(0, 5);

    // Save to localStorage
    localStorage.setItem('recentScans', JSON.stringify(recentScans));

    // Render
    renderRecentScans();
}

// Render recent scans
function renderRecentScans() {
    if (recentScans.length === 0) {
        recentScansSection.style.display = 'none';
        return;
    }

    recentScansSection.style.display = 'block';
    recentScansList.innerHTML = '';

    recentScans.forEach(scan => {
        const item = document.createElement('div');
        item.className = 'recent-scan-item';

        const timestamp = new Date(scan.timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - timestamp) / 1000 / 60);

        let timeAgo;
        if (diffMinutes < 1) {
            timeAgo = 'Just now';
        } else if (diffMinutes < 60) {
            timeAgo = `${diffMinutes} min ago`;
        } else {
            const diffHours = Math.floor(diffMinutes / 60);
            timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        }

        item.innerHTML = `
            <svg class="scan-icon" width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 10L9.5 12L13 8M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="scan-details">
                <span class="scan-number">${scan.quotation}</span>
                <span class="scan-time">${timeAgo}</span>
            </div>
        `;

        recentScansList.appendChild(item);
    });
}

// Show status banner
function showStatus(message, type) {
    statusBanner.textContent = message;
    statusBanner.className = `status-banner ${type}`;
    statusBanner.style.cursor = 'pointer';
    statusBanner.title = 'Click to dismiss';
}

// Hide status banner
function hideStatus() {
    statusBanner.className = 'status-banner';
    statusBanner.textContent = '';
}

// Update recent scans time periodically
setInterval(() => {
    if (recentScans.length > 0) {
        renderRecentScans();
    }
}, 30000);

// Auto-refresh users every 30 seconds
setInterval(() => {
    loadUsers();
}, 30000);
