#!/bin/bash

################################################################################
# Quotation Scanner Installer
# For Ubuntu 24 LTS Server
#
# Usage: sudo ./instal.sh
#
# Options:
#   1. Install - Fresh installation
#   2. Update - Pull latest changes from GitHub
#   3. Remove - Complete removal
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Quotation-Scanner"
INSTALL_DIR="/opt/quotation-scanner"
REPO_URL="https://github.com/YOUR_USERNAME/Quotation-Scanner.git"
DEFAULT_PORT="5555"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        echo "Please run: sudo $0"
        exit 1
    fi
}

# Check Ubuntu version
check_ubuntu_version() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" != "ubuntu" ]]; then
            print_warning "This script is designed for Ubuntu 24 LTS"
            print_warning "Detected: $ID $VERSION_ID"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        print_warning "Cannot detect OS version"
    fi
}

# Validate IP address
validate_ip() {
    local ip=$1
    local stat=1

    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        OIFS=$IFS
        IFS='.'
        ip=($ip)
        IFS=$OIFS
        [[ ${ip[0]} -le 255 && ${ip[1]} -le 255 && ${ip[2]} -le 255 && ${ip[3]} -le 255 ]]
        stat=$?
    fi
    return $stat
}

# Prompt for local IP address
get_local_ip() {
    print_info "Please enter the local IP address where this application will be accessible"
    print_info "This will be used to configure the application"

    # Try to detect local IP
    LOCAL_IP=$(hostname -I | awk '{print $1}')

    while true; do
        if [ -n "$LOCAL_IP" ]; then
            read -p "Local IP address [$LOCAL_IP]: " INPUT_IP
            IP_ADDRESS=${INPUT_IP:-$LOCAL_IP}
        else
            read -p "Local IP address: " IP_ADDRESS
        fi

        if validate_ip "$IP_ADDRESS"; then
            print_success "IP address set to: $IP_ADDRESS"
            break
        else
            print_error "Invalid IP address format. Please try again."
        fi
    done
}

################################################################################
# Installation Functions
################################################################################

install_docker() {
    print_header "Installing Docker"

    if command -v docker &> /dev/null; then
        print_info "Docker is already installed"
        docker --version
        return 0
    fi

    print_info "Updating package index..."
    apt-get update -qq

    print_info "Installing prerequisites..."
    apt-get install -y -qq \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    print_info "Adding Docker's official GPG key..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    print_info "Setting up Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    print_info "Installing Docker..."
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    print_info "Starting Docker service..."
    systemctl start docker
    systemctl enable docker

    print_success "Docker installed successfully"
    docker --version
}

install_git() {
    print_header "Installing Git"

    if command -v git &> /dev/null; then
        print_info "Git is already installed"
        git --version
        return 0
    fi

    print_info "Installing Git..."
    apt-get install -y -qq git

    print_success "Git installed successfully"
    git --version
}

clone_repository() {
    print_header "Cloning Repository"

    if [ -d "$INSTALL_DIR" ]; then
        print_warning "Installation directory already exists: $INSTALL_DIR"
        read -p "Remove and re-clone? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
        else
            print_error "Installation cancelled"
            exit 1
        fi
    fi

    print_info "Cloning from $REPO_URL..."
    git clone "$REPO_URL" "$INSTALL_DIR"

    print_success "Repository cloned successfully"
}

configure_application() {
    print_header "Configuring Application"

    cd "$INSTALL_DIR"

    # Create data directory if it doesn't exist
    if [ ! -d "data" ]; then
        mkdir -p data
        print_success "Created data directory"
    fi

    # Update docker-compose.yml with custom port if needed
    print_info "Application will be accessible at: http://$IP_ADDRESS:$DEFAULT_PORT"

    print_success "Configuration completed"
}

build_and_start() {
    print_header "Building and Starting Application"

    cd "$INSTALL_DIR"

    print_info "Building Docker images..."
    docker compose build

    print_info "Starting containers..."
    docker compose up -d

    print_info "Waiting for application to start..."
    sleep 5

    # Check if container is running
    if docker compose ps | grep -q "Up"; then
        print_success "Application started successfully!"
    else
        print_error "Failed to start application"
        print_info "Check logs with: cd $INSTALL_DIR && docker compose logs"
        exit 1
    fi
}

################################################################################
# Update Function
################################################################################

update_application() {
    print_header "Updating Application"

    if [ ! -d "$INSTALL_DIR" ]; then
        print_error "Application is not installed"
        print_info "Please run installation first"
        exit 1
    fi

    cd "$INSTALL_DIR"

    print_info "Backing up data directory..."
    if [ -d "data" ]; then
        cp -r data data.backup.$(date +%Y%m%d_%H%M%S)
        print_success "Data backed up"
    fi

    print_info "Stopping containers..."
    docker compose down

    print_info "Pulling latest changes from GitHub..."
    git pull origin main

    print_info "Rebuilding containers..."
    docker compose build

    print_info "Starting containers..."
    docker compose up -d

    print_info "Waiting for application to start..."
    sleep 5

    if docker compose ps | grep -q "Up"; then
        print_success "Application updated successfully!"
    else
        print_error "Failed to start application after update"
        print_info "Check logs with: cd $INSTALL_DIR && docker compose logs"
        exit 1
    fi
}

################################################################################
# Remove Function
################################################################################

remove_application() {
    print_header "Removing Application"

    print_warning "This will remove the application and all containers"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Removal cancelled"
        exit 0
    fi

    if [ -d "$INSTALL_DIR" ]; then
        cd "$INSTALL_DIR"

        print_info "Stopping containers..."
        docker compose down -v || true

        print_info "Removing Docker images..."
        docker compose rm -f || true
        docker rmi quotation-scan-quotation-scan 2>/dev/null || true

        cd /

        # Ask about data directory
        if [ -d "$INSTALL_DIR/data" ]; then
            print_warning "Data directory contains user data and SQL configuration"
            read -p "Remove data directory? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rm -rf "$INSTALL_DIR/data"
                print_info "Data directory removed"
            else
                print_info "Data directory preserved at: $INSTALL_DIR/data"
            fi
        fi

        print_info "Removing application directory..."
        rm -rf "$INSTALL_DIR"

        print_success "Application removed successfully"
    else
        print_warning "Application directory not found: $INSTALL_DIR"
    fi

    # Ask about Docker
    read -p "Remove Docker? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Removing Docker..."
        apt-get remove -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        apt-get autoremove -y
        print_success "Docker removed"
    else
        print_info "Docker preserved"
    fi
}

################################################################################
# Main Menu
################################################################################

show_menu() {
    print_header "Quotation Scanner Installer"

    echo "Please select an option:"
    echo ""
    echo "  1) Install - Fresh installation on clean system"
    echo "  2) Update  - Pull latest changes from GitHub and rebuild"
    echo "  3) Remove  - Complete removal of application"
    echo "  4) Exit"
    echo ""
}

main_install() {
    print_header "Starting Fresh Installation"

    check_ubuntu_version
    get_local_ip
    install_docker
    install_git
    clone_repository
    configure_application
    build_and_start

    print_header "Installation Complete!"
    echo ""
    print_success "Application is running at: http://$IP_ADDRESS:$DEFAULT_PORT"
    echo ""
    print_info "Next steps:"
    echo "  1. Open http://$IP_ADDRESS:$DEFAULT_PORT in your browser"
    echo "  2. Go to Settings"
    echo "  3. Configure SQL Server connection"
    echo "  4. Add users"
    echo "  5. Start scanning!"
    echo ""
    print_info "Useful commands:"
    echo "  - View logs: cd $INSTALL_DIR && docker compose logs -f"
    echo "  - Restart: cd $INSTALL_DIR && docker compose restart"
    echo "  - Stop: cd $INSTALL_DIR && docker compose down"
    echo "  - Start: cd $INSTALL_DIR && docker compose up -d"
    echo ""
}

################################################################################
# Main Script
################################################################################

check_root

# If run without arguments, show menu
if [ $# -eq 0 ]; then
    while true; do
        show_menu
        read -p "Enter your choice [1-4]: " choice

        case $choice in
            1)
                main_install
                break
                ;;
            2)
                update_application
                break
                ;;
            3)
                remove_application
                break
                ;;
            4)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
    done
else
    # Handle command line arguments
    case "$1" in
        install)
            main_install
            ;;
        update)
            update_application
            ;;
        remove)
            remove_application
            ;;
        *)
            echo "Usage: $0 [install|update|remove]"
            echo "Or run without arguments for interactive menu"
            exit 1
            ;;
    esac
fi
