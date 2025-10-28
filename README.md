# Quotation Scanner

A modern web application for scanning and tracking quotation processing with barcode input. Built with Python Flask, SQLite, and SQL Server integration.

## Features

- 🔍 **Barcode Scanning** - Quick quotation number scanning with hardware or manual input
- 👥 **User Management** - Track which user processed each quotation
- 📊 **Dual Scan Tracking** - Records first and second scan timestamps
- 🗄️ **SQL Server Integration** - Connects to existing QuotationsStatus database via FreeTDS
- 🎨 **Modern UI** - Clean, professional Material Design 3 interface
- 🔄 **Real-time Updates** - No caching for instant data refresh
- 🐳 **Docker Deployment** - Easy setup and consistent environment
- ⚡ **Auto-refresh** - Page refreshes 5 seconds after successful scan

## Quick Installation

### One-Line Install (Ubuntu 24 LTS)

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/Quotation-Scanner/main/instal.sh | sudo bash
```

### Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/Quotation-Scanner.git
cd Quotation-Scanner
```

2. Run the installer:
```bash
chmod +x instal.sh
sudo ./instal.sh
```

3. Follow the prompts to configure your installation

## Usage

### First Time Setup

1. Open the application in your browser: `http://YOUR_IP:5555`
2. Navigate to **Settings**
3. Configure SQL Server connection:
   - Server address
   - Database name
   - Username
   - Password
4. Click "Test Connection" to verify
5. Add users who will be scanning quotations

### Scanning Quotations

1. Select your username from the grid
2. Scan or enter quotation number
3. Press Enter to process
4. View success message
5. Page auto-refreshes after 5 seconds

## How It Works

### Scan Tracking

Each quotation can be scanned twice:

- **First Scan**: Records timestamp in `Dop2` field and username in `Packer` field
- **Second Scan**: Records timestamp in `Dop3` field
- **Third Scan**: Shows error message (quotation already scanned twice)

### Database Schema

The application uses the `QuotationsStatus` table with these key fields:

- `QuotationNumber`: Unique quotation identifier (scanned barcode)
- `Packer`: Username of the person who scanned
- `Dop2`: First scan timestamp (format: `01/27/2025 2:30 PM`)
- `Dop3`: Second scan timestamp (format: `01/27/2025 2:30 PM`)

## Technology Stack

- **Backend**: Python 3.11 + Flask
- **Database**:
  - SQLite (local user storage and configuration)
  - SQL Server (quotation data) via pymssql + FreeTDS
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Deployment**: Docker + Docker Compose
- **Design**: Material Design 3 principles

## Requirements

- Ubuntu 24 LTS (or compatible Linux distribution)
- Docker and Docker Compose
- SQL Server database with QuotationsStatus table
- Network access to SQL Server

## Configuration

### Environment Variables

The application can be configured via environment variables in `docker-compose.yml`:

- `FLASK_ENV`: Set to `development` or `production`
- Port mapping: Default is `5555:5000` (change if port conflict)

### SQL Server Connection

SQL Server credentials are stored securely in SQLite and configured via the web interface.

## Installer Options

The `instal.sh` script supports three modes:

1. **Install** - Fresh installation on clean system
2. **Update** - Pull latest changes from GitHub and rebuild
3. **Remove** - Complete removal of application and containers

## Troubleshooting

### Cannot connect to SQL Server

1. Verify SQL Server is accessible from the Docker container
2. Check firewall settings on SQL Server host
3. Ensure SQL Server is configured to accept TCP/IP connections
4. Test connection using the "Test Connection" button in Settings

### Users not appearing

1. Check if SQLite database is created in `/data` directory
2. Restart the Docker container: `docker-compose restart`
3. Check browser console for JavaScript errors

### Scans not recording

1. Verify SQL Server connection in Settings
2. Check that QuotationsStatus table exists
3. Verify Dop2 and Dop3 columns are varchar(255) type
4. Check Docker logs: `docker-compose logs`

### Port already in use

Edit `docker-compose.yml` and change the port mapping:
```yaml
ports:
  - "YOUR_PORT:5000"
```

## Development

### Running Locally (without Docker)

```bash
# Install dependencies
pip install -r requirements.txt

# Run application
python -m app.main
```

Access at `http://localhost:5000`

### Project Structure

```
Quotation-Scanner/
├── README.md              # This file
├── instal.sh             # Installation script
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile           # Docker image definition
├── requirements.txt     # Python dependencies
├── DBSCHEMA.md         # Database schema documentation
├── app/
│   ├── __init__.py
│   ├── main.py         # Flask application
│   ├── database.py     # Database managers
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       ├── app.js       # Main page logic
│   │       └── settings.js  # Settings page logic
│   └── templates/
│       ├── index.html       # Main scanning page
│       └── settings.html    # Settings page
└── data/                    # SQLite databases (created at runtime)
```

## API Endpoints

- `GET /` - Main scanning page
- `GET /settings` - Settings page
- `GET /api/users` - Get all users
- `POST /api/users` - Add new user
- `DELETE /api/users/<id>` - Delete user
- `GET /api/sql-connection` - Get SQL config (without password)
- `POST /api/sql-connection` - Save SQL config
- `POST /api/test-connection` - Test SQL connection
- `POST /api/scan` - Process quotation scan
- `GET /health` - Health check

## Security Notes

- SQL Server credentials are stored in local SQLite database
- No password is returned via API endpoints
- Application should be run behind a reverse proxy (nginx) in production
- Consider using HTTPS in production environment
- Change default port if exposed to network

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Changelog

### v1.0.0 (Initial Release)
- Barcode scanning functionality
- User management system
- SQL Server integration
- Material Design 3 UI
- Docker deployment
- Auto-refresh after scan
- Ubuntu 24 installer script
