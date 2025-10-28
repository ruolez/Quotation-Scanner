FROM python:3.11-slim

# Install FreeTDS and other dependencies
RUN apt-get update && apt-get install -y \
    freetds-dev \
    freetds-bin \
    unixodbc-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 5000

# Run the application
CMD ["python", "-m", "app.main"]
