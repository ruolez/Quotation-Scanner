// Global state
let selectedUser = null;

// DOM Elements
const userList = document.getElementById('userList');
const quotationInput = document.getElementById('quotationInput');
const scanButton = document.getElementById('scanButton');
const statusMessage = document.getElementById('statusMessage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setupEventListeners();
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
            renderUsers(data.users);
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

    users.forEach(user => {
        const button = document.createElement('button');
        button.className = 'user-button';
        button.textContent = user.name;
        button.dataset.userId = user.id;
        button.dataset.userName = user.name;

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

    // Enable input and focus
    quotationInput.disabled = false;
    scanButton.disabled = false;
    quotationInput.focus();

    // Clear status message
    hideStatus();
}

// Setup event listeners
function setupEventListeners() {
    // Enter key on input
    quotationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processScan();
        }
    });

    // Scan button click
    scanButton.addEventListener('click', processScan);
}

// Process scan
async function processScan() {
    const quotationNumber = quotationInput.value.trim();

    // Validate user selection
    if (!selectedUser) {
        showStatus('Please select a user first', 'error');
        return;
    }

    // Validate quotation number
    if (!quotationNumber) {
        showStatus('Please enter a quotation number', 'error');
        quotationInput.focus();
        return;
    }

    // Disable input during processing
    quotationInput.disabled = true;
    scanButton.disabled = true;

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

        if (data.success) {
            // Success
            const scanType = data.scan_number === 1 ? 'First' : 'Second';
            showStatus(
                `${scanType} scan successful! Quotation: ${quotationNumber}, Time: ${data.timestamp}. Refreshing in 5 seconds...`,
                'success'
            );

            // Clear input
            quotationInput.value = '';

            // Reload page after 5 seconds
            setTimeout(() => {
                location.reload();
            }, 5000);
        } else {
            // Error from server
            showStatus(data.error || 'An error occurred', 'error');

            // Re-enable input after error display
            setTimeout(() => {
                quotationInput.disabled = false;
                scanButton.disabled = false;
                quotationInput.focus();
            }, 2000);
        }
    } catch (error) {
        console.error('Error processing scan:', error);
        showStatus('Network error. Please check your connection and try again.', 'error');

        // Re-enable input
        setTimeout(() => {
            quotationInput.disabled = false;
            scanButton.disabled = false;
            quotationInput.focus();
        }, 2000);
    }
}

// Show status message
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
}

// Hide status message
function hideStatus() {
    statusMessage.className = 'status-message';
    statusMessage.textContent = '';
}

// Auto-refresh users every 30 seconds
setInterval(() => {
    loadUsers();
}, 30000);
