import sqlite3
import pymssql
import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional, Dict, List, Any

# SQLite database path
SQLITE_DB_PATH = '/app/data/users.db'
CONFIG_DB_PATH = '/app/data/config.db'


class SQLiteManager:
    """Manages local SQLite database for users and configuration"""

    def __init__(self):
        self.init_database()

    def get_connection(self):
        """Get SQLite connection"""
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def get_config_connection(self):
        """Get config database connection"""
        conn = sqlite3.connect(CONFIG_DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def init_database(self):
        """Initialize SQLite database with users table"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        conn.commit()
        conn.close()

        # Initialize config database
        config_conn = self.get_config_connection()
        config_cursor = config_conn.cursor()

        config_cursor.execute('''
            CREATE TABLE IF NOT EXISTS sql_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                server TEXT,
                database TEXT,
                username TEXT,
                password TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        config_conn.commit()
        config_conn.close()

    def add_user(self, name: str) -> Dict[str, Any]:
        """Add a new user"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('INSERT INTO users (name) VALUES (?)', (name,))
            conn.commit()
            user_id = cursor.lastrowid
            return {'id': user_id, 'name': name, 'success': True}
        except sqlite3.IntegrityError:
            return {'success': False, 'error': 'User already exists'}
        finally:
            conn.close()

    def get_users(self) -> List[Dict[str, Any]]:
        """Get all users"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id, name, created_at FROM users ORDER BY name')
        users = [dict(row) for row in cursor.fetchall()]

        conn.close()
        return users

    def delete_user(self, user_id: int) -> bool:
        """Delete a user"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        deleted = cursor.rowcount > 0

        conn.commit()
        conn.close()

        return deleted

    def save_sql_config(self, server: str, database: str, username: str, password: str) -> bool:
        """Save SQL Server configuration"""
        conn = self.get_config_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT OR REPLACE INTO sql_config (id, server, database, username, password, updated_at)
                VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (server, database, username, password))

            conn.commit()
            return True
        except Exception as e:
            print(f"Error saving SQL config: {e}")
            return False
        finally:
            conn.close()

    def get_sql_config(self) -> Optional[Dict[str, str]]:
        """Get SQL Server configuration"""
        conn = self.get_config_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT server, database, username, password FROM sql_config WHERE id = 1')
        row = cursor.fetchone()

        conn.close()

        if row:
            return dict(row)
        return None


class SQLServerManager:
    """Manages SQL Server connection and quotation operations"""

    def __init__(self, server: str, database: str, username: str, password: str):
        self.server = server
        self.database = database
        self.username = username
        self.password = password

    def get_connection(self):
        """Get SQL Server connection using pymssql"""
        try:
            conn = pymssql.connect(
                server=self.server,
                database=self.database,
                user=self.username,
                password=self.password,
                timeout=10,
                login_timeout=10
            )
            return conn
        except Exception as e:
            raise Exception(f"Failed to connect to SQL Server: {str(e)}")

    def test_connection(self) -> Dict[str, Any]:
        """Test SQL Server connection"""
        try:
            conn = self.get_connection()
            conn.close()
            return {'success': True, 'message': 'Connection successful'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def process_quotation_scan(self, quotation_number: str, username: str) -> Dict[str, Any]:
        """Process a quotation scan and update the database"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Look up quotation by QuotationNumber
            cursor.execute('''
                SELECT id, QuotationNumber, Packer, Dop2, Dop3, AccountNo
                FROM dbo.QuotationsStatus
                WHERE QuotationNumber = %s
            ''', (quotation_number,))

            row = cursor.fetchone()

            if not row:
                conn.close()
                return {
                    'success': False,
                    'error': f'Quotation number {quotation_number} not found'
                }

            quotation_id, qnum, packer, dop2, dop3, account_no = row

            # Get current timestamp in Central Time (Chicago)
            current_time = datetime.now(ZoneInfo('America/Chicago'))
            timestamp = current_time.strftime('%m/%d/%Y %I:%M %p')

            # Check if this quotation was scanned within the last 2 minutes
            most_recent_scan = None
            most_recent_time = None

            # Check Dop3 first (most recent if it exists)
            if dop3 and dop3.strip():
                try:
                    most_recent_time = datetime.strptime(dop3.strip(), '%m/%d/%Y %I:%M %p').replace(tzinfo=ZoneInfo('America/Chicago'))
                    most_recent_scan = 'second'
                except ValueError:
                    pass

            # Check Dop2 if Dop3 wasn't valid or doesn't exist
            if not most_recent_time and dop2 and dop2.strip():
                try:
                    most_recent_time = datetime.strptime(dop2.strip(), '%m/%d/%Y %I:%M %p').replace(tzinfo=ZoneInfo('America/Chicago'))
                    most_recent_scan = 'first'
                except ValueError:
                    pass

            # If we found a recent scan, check if it's within 2 minutes
            if most_recent_time:
                time_diff = (current_time - most_recent_time).total_seconds()
                if time_diff < 120:  # 120 seconds = 2 minutes
                    seconds_ago = int(time_diff)
                    seconds_remaining = 120 - seconds_ago
                    minutes_remaining = seconds_remaining // 60
                    secs_remaining = seconds_remaining % 60

                    if minutes_remaining > 0:
                        wait_msg = f"{minutes_remaining} minute(s) {secs_remaining} second(s)"
                    else:
                        wait_msg = f"{secs_remaining} second(s)"

                    conn.close()
                    return {
                        'success': False,
                        'error': f'Quotation {quotation_number} was scanned {seconds_ago} second(s) ago. Please wait {wait_msg} before scanning again.',
                        'seconds_ago': seconds_ago,
                        'seconds_remaining': seconds_remaining
                    }

            # Determine which field to update
            if not dop2 or dop2.strip() == '':
                # First scan - update Dop2 and Packer
                cursor.execute('''
                    UPDATE dbo.QuotationsStatus
                    SET Dop2 = %s, Packer = %s
                    WHERE id = %s
                ''', (timestamp, username, quotation_id))

                conn.commit()
                conn.close()

                return {
                    'success': True,
                    'message': f'First scan recorded for quotation {quotation_number}',
                    'scan_number': 1,
                    'timestamp': timestamp,
                    'account_no': account_no
                }

            elif not dop3 or dop3.strip() == '':
                # Second scan - update Dop3
                cursor.execute('''
                    UPDATE dbo.QuotationsStatus
                    SET Dop3 = %s
                    WHERE id = %s
                ''', (timestamp, quotation_id))

                conn.commit()
                conn.close()

                return {
                    'success': True,
                    'message': f'Second scan recorded for quotation {quotation_number}',
                    'scan_number': 2,
                    'timestamp': timestamp,
                    'account_no': account_no
                }

            else:
                # Both Dop2 and Dop3 are filled - error
                conn.close()
                return {
                    'success': False,
                    'error': f'Quotation {quotation_number} has already been scanned twice',
                    'dop2': dop2,
                    'dop3': dop3
                }

        except Exception as e:
            return {
                'success': False,
                'error': f'Database error: {str(e)}'
            }
