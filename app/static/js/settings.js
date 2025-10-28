// DOM Elements
const sqlConfigForm = document.getElementById('sqlConfigForm');
const testConnectionBtn = document.getElementById('testConnectionBtn');
const sqlStatusMessage = document.getElementById('sqlStatusMessage');

const addUserForm = document.getElementById('addUserForm');
const userStatusMessage = document.getElementById('userStatusMessage');
const userListSettings = document.getElementById('userListSettings');

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
            showSQLStatus('SQL Server configuration saved successfully!', 'success');
            document.getElementById('password').value = '';
            document.getElementById('password').placeholder = '••••••••';
        } else {
            showSQLStatus(data.error || 'Failed to save configuration', 'error');
        }
    } catch (error) {
        console.error('Error saving SQL config:', error);
        showSQLStatus('Network error. Please try again.', 'error');
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
        showSQLStatus('Please fill in all fields to test connection', 'error');
        return;
    }

    // Show loading state
    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = 'Testing...';

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
            showSQLStatus('Connection successful!', 'success');
        } else {
            showSQLStatus(`Connection failed: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        showSQLStatus('Network error. Please try again.', 'error');
    } finally {
        // Reset button
        testConnectionBtn.disabled = false;
        testConnectionBtn.textContent = 'Test Connection';
    }
}

// Show SQL status message
function showSQLStatus(message, type) {
    sqlStatusMessage.textContent = message;
    sqlStatusMessage.className = `status-message ${type}`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        sqlStatusMessage.className = 'status-message';
    }, 5000);
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
            renderUsers(data.users);
        } else {
            userListSettings.innerHTML = '<p class="loading">No users yet. Add your first user above.</p>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        userListSettings.innerHTML = '<p class="loading error">Error loading users.</p>';
    }
}

// Render users
function renderUsers(users) {
    userListSettings.innerHTML = '';

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';

        const userName = document.createElement('span');
        userName.className = 'user-name';
        userName.textContent = user.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteUser(user.id));

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
        showUserStatus('Please enter a user name', 'error');
        return;
    }

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
            showUserStatus('User added successfully!', 'success');
            document.getElementById('userName').value = '';
            loadUsers(); // Reload user list
        } else {
            showUserStatus(data.error || 'Failed to add user', 'error');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        showUserStatus('Network error. Please try again.', 'error');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
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
            showUserStatus('User deleted successfully', 'success');
            loadUsers(); // Reload user list
        } else {
            showUserStatus(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showUserStatus('Network error. Please try again.', 'error');
    }
}

// Show user status message
function showUserStatus(message, type) {
    userStatusMessage.textContent = message;
    userStatusMessage.className = `status-message ${type}`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        userStatusMessage.className = 'status-message';
    }, 5000);
}
