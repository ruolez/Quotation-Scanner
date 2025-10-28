from flask import Flask, render_template, request, jsonify, make_response
from app.database import SQLiteManager, SQLServerManager
import os

app = Flask(__name__)

# Disable caching
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Initialize SQLite manager
sqlite_manager = SQLiteManager()


@app.after_request
def add_no_cache_headers(response):
    """Add headers to prevent caching"""
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


# ==================== PAGES ====================

@app.route('/')
def index():
    """Main scanning page"""
    return render_template('index.html')


@app.route('/settings')
def settings():
    """Settings page"""
    return render_template('settings.html')


# ==================== USER API ====================

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users"""
    users = sqlite_manager.get_users()
    return jsonify({'success': True, 'users': users})


@app.route('/api/users', methods=['POST'])
def add_user():
    """Add a new user"""
    data = request.get_json()
    name = data.get('name', '').strip()

    if not name:
        return jsonify({'success': False, 'error': 'Name is required'}), 400

    result = sqlite_manager.add_user(name)

    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a user"""
    success = sqlite_manager.delete_user(user_id)

    if success:
        return jsonify({'success': True, 'message': 'User deleted'})
    else:
        return jsonify({'success': False, 'error': 'User not found'}), 404


# ==================== SQL SERVER CONFIG API ====================

@app.route('/api/sql-connection', methods=['GET'])
def get_sql_connection():
    """Get SQL Server connection configuration"""
    config = sqlite_manager.get_sql_config()

    if config:
        # Return config without password for security
        return jsonify({
            'success': True,
            'config': {
                'server': config['server'],
                'database': config['database'],
                'username': config['username'],
                'has_password': bool(config['password'])
            }
        })
    else:
        return jsonify({'success': False, 'message': 'No configuration found'})


@app.route('/api/sql-connection', methods=['POST'])
def save_sql_connection():
    """Save SQL Server connection configuration"""
    data = request.get_json()

    server = data.get('server', '').strip()
    database = data.get('database', '').strip()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not all([server, database, username, password]):
        return jsonify({
            'success': False,
            'error': 'All fields are required'
        }), 400

    success = sqlite_manager.save_sql_config(server, database, username, password)

    if success:
        return jsonify({
            'success': True,
            'message': 'SQL Server configuration saved'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Failed to save configuration'
        }), 500


@app.route('/api/test-connection', methods=['POST'])
def test_connection():
    """Test SQL Server connection"""
    data = request.get_json()

    server = data.get('server', '').strip()
    database = data.get('database', '').strip()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not all([server, database, username, password]):
        return jsonify({
            'success': False,
            'error': 'All fields are required for testing'
        }), 400

    try:
        sql_manager = SQLServerManager(server, database, username, password)
        result = sql_manager.test_connection()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== QUOTATION SCAN API ====================

@app.route('/api/scan', methods=['POST'])
def scan_quotation():
    """Process a quotation scan"""
    data = request.get_json()

    quotation_number = data.get('quotation_number', '').strip()
    username = data.get('username', '').strip()

    # Validate inputs
    if not quotation_number:
        return jsonify({
            'success': False,
            'error': 'Quotation number is required'
        }), 400

    if not username:
        return jsonify({
            'success': False,
            'error': 'Please select a user first'
        }), 400

    # Get SQL Server configuration
    config = sqlite_manager.get_sql_config()

    if not config:
        return jsonify({
            'success': False,
            'error': 'SQL Server not configured. Please configure in Settings.'
        }), 400

    # Create SQL Server manager and process scan
    try:
        sql_manager = SQLServerManager(
            config['server'],
            config['database'],
            config['username'],
            config['password']
        )

        result = sql_manager.process_quotation_scan(quotation_number, username)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error processing scan: {str(e)}'
        }), 500


# ==================== HEALTH CHECK ====================

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
