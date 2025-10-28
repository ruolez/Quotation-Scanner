// Global state
let allUsers = [];

// DOM Elements
const sqlConfigForm = document.getElementById('sqlConfigForm');
const testConnectionBtn = document.getElementById('testConnectionBtn');
const statusBanner = document.getElementById('statusBanner');

const addUserForm = document.getElementById('addUserForm');
const userListSettings = document.getElementById('userListSettings');
const userCount = document.getElementById('userCount');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSQLConfig();
    loadUsers();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    sqlConfigForm.addEventListener('submit', saveSQLConfig);
    testConnectionBtn.addEventListener('click', testConnection);
    addUserForm.addEventListener('submit', addUser);

    // Dismiss status banner on click
    statusBanner.addEventListener('click', hideStatus);
}

// ==================== SQL Configuration ====================

// Load SQL configuration
async function loadSQLConfig() {
    try {
        const response = await fetch('/api/sql-connection', {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            return;
        }

        const data = await response.json();

        if (data.success && data.config) {
            document.getElementById('server').value = data.config.server || '';
            document.getElementById('database').value = data.config.database || '';
            document.getElementById('username').value = data.config.username || '';

            // Show placeholder for password if it exists
            if (data.config.has_password) {
                document.getElementById('password').placeholder = '••••••••';
            }
        }
    } catch (error) {
        console.error('Error loading SQL config:', error);
    }
}

// Save SQL configuration
async function saveSQLConfig(e) {
    e.preventDefault();

    const config = {
        server: document.getElementById('server').value.trim(),
        database: document.getElementById('database').value.trim(),
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value
    };

    const submitBtn = sqlConfigForm.querySelector('.btn-primary');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');

    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';

    try {
        const response = await fetch('/api/sql-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        if (data.success) {
            showStatus('✓ SQL Server configuration saved successfully!', 'success');
            document.getElementById('password').value = '';
            document.getElementById('password').placeholder = '••••••••';
        } else {
            showStatus(data.error || 'Failed to save configuration', 'error');
        }
    } catch (error) {
        console.error('Error saving SQL config:', error);
        showStatus('Network error. Please try again.', 'error');
    } finally {
        // Reset button
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
}

// Test SQL connection
async function testConnection() {
    const config = {
        server: document.getElementById('server').value.trim(),
        database: document.getElementById('database').value.trim(),
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value
    };

    if (!config.server || !config.database || !config.username || !config.password) {
        showStatus('Please fill in all fields to test connection', 'error');
        return;
    }

    const btnText = testConnectionBtn.querySelector('.btn-text');
    const btnSpinner = testConnectionBtn.querySelector('.btn-spinner');

    // Show loading state
    testConnectionBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';

    try {
        const response = await fetch('/api/test-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        if (data.success) {
            showStatus('✓ Connection successful! Database is accessible.', 'success');
        } else {
            showStatus(`Connection failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        showStatus('Network error. Please try again.', 'error');
    } finally {
        // Reset button
        testConnectionBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
}

// ==================== User Management ====================

// Load users
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const data = await response.json();

        if (data.success && data.users.length > 0) {
            allUsers = data.users.sort((a, b) => a.name.localeCompare(b.name));
            updateUserCount(allUsers.length);
            renderUsers(allUsers);
        } else {
            allUsers = [];
            updateUserCount(0);
            userListSettings.innerHTML = '<p class="loading">No users yet. Add your first user above.</p>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        userListSettings.innerHTML = '<p class="loading error">Error loading users.</p>';
    }
}

// Update user count display
function updateUserCount(count) {
    userCount.textContent = `${count} user${count !== 1 ? 's' : ''}`;
}

// Render users
function renderUsers(users) {
    userListSettings.innerHTML = '';

    if (users.length === 0) {
        userListSettings.innerHTML = '<p class="loading">No matching users found.</p>';
        return;
    }

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';

        const userName = document.createElement('span');
        userName.className = 'user-name';
        userName.textContent = user.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteUser(user.id, user.name));

        userItem.appendChild(userName);
        userItem.appendChild(deleteBtn);

        userListSettings.appendChild(userItem);
    });
}

// Add user
async function addUser(e) {
    e.preventDefault();

    const userName = document.getElementById('userName').value.trim();

    if (!userName) {
        showStatus('Please enter a user name', 'error');
        return;
    }

    const submitBtn = addUserForm.querySelector('.btn-primary');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');

    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({ name: userName })
        });

        const data = await response.json();

        if (data.success) {
            showStatus(`✓ User "${userName}" added successfully!`, 'success');
            document.getElementById('userName').value = '';
            loadUsers(); // Reload user list
        } else {
            showStatus(data.error || 'Failed to add user', 'error');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        showStatus('Network error. Please try again.', 'error');
    } finally {
        // Reset button
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
}

// Delete user
async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete "${userName}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        const data = await response.json();

        if (data.success) {
            showStatus(`✓ User "${userName}" deleted successfully`, 'success');
            loadUsers(); // Reload user list
        } else {
            showStatus(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showStatus('Network error. Please try again.', 'error');
    }
}

// ==================== Status Messages ====================

// Show status banner
function showStatus(message, type) {
    statusBanner.textContent = message;
    statusBanner.className = `status-banner ${type}`;
    statusBanner.style.cursor = 'pointer';
    statusBanner.title = 'Click to dismiss';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideStatus();
    }, 5000);
}

// Hide status banner
function hideStatus() {
    statusBanner.className = 'status-banner';
    statusBanner.textContent = '';
}
