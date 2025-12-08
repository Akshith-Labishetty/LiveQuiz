# LiveQuiz Monitoring & Logging Setup Guide

Complete guide for setting up **Prometheus monitoring** and **Logstash logging** for the LiveQuiz application.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Installation](#installation)
5. [Running with Docker](#running-with-docker)
6. [Running Locally](#running-locally)
7. [Verification Steps](#verification-steps)
8. [Grafana Dashboard Setup](#grafana-dashboard-setup-optional)
9. [Troubleshooting](#troubleshooting)
10. [Production Considerations](#production-considerations)

---

## 🎯 Overview

This setup provides:

- ✅ **Prometheus Monitoring**: Real-time metrics collection for application performance
  - Default system metrics (CPU, memory, event loop)
  - Custom business metrics (logins, quizzes, submissions, active users)
  - HTTP request tracking (duration, count, status codes)
  
- ✅ **Centralized Logging**: Structured JSON logs with Logstash
  - File-based log collection
  - JSON parsing and enrichment
  - Elasticsearch storage
  - Kibana visualization

- ✅ **Docker Integration**: Complete containerized monitoring stack
  - Prometheus (port 9090)
  - Elasticsearch (port 9200)
  - Logstash (port 5044, 5000)
  - Kibana (port 5601)
  - Grafana (port 3000)

---

## ✅ Prerequisites

Before starting, ensure you have:

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker** >= 20.x (for containerized setup)
- **Docker Compose** >= 2.x
- MongoDB running (for the application)
- Redis running (for the application)

---

## 📁 Project Structure

After setup, your project should look like this:

```
L/
├── BACKEND/
│   ├── config/
│   │   ├── metrics.js          # Prometheus metrics configuration
│   │   └── logger.js           # Winston logger configuration
│   ├── logs/                   # Log files (auto-created)
│   │   ├── app.log            # All logs in JSON format
│   │   └── error.log          # Error logs only
│   ├── middleware/
│   ├── models/
│   ├── queue/
│   ├── server.js              # Main server (updated with monitoring)
│   └── package.json
├── FRONTEND/
├── docker-compose.yml         # Docker services configuration
├── prometheus.yml             # Prometheus scrape configuration
├── logstash.conf             # Logstash pipeline configuration
└── MONITORING_SETUP.md       # This file
```

---

## 🔧 Installation

### Step 1: Install Dependencies

Navigate to the BACKEND directory and install new dependencies:

```bash
cd BACKEND
npm install prom-client winston
```

### Step 2: Verify Files

Ensure all new files are in place:

```bash
# Check configuration files exist
ls config/metrics.js
ls config/logger.js

# Check Docker files exist (in project root)
cd ..
ls docker-compose.yml
ls prometheus.yml
ls logstash.conf
```

---

## 🐳 Running with Docker

This is the **recommended approach** for a complete monitoring and logging stack.

### Step 1: Start All Services

From the project root directory:

```bash
# Start all monitoring services
docker-compose up -d

# View logs to ensure everything started correctly
docker-compose logs -f
```

This will start:
- Prometheus on http://localhost:9090
- Elasticsearch on http://localhost:9200
- Logstash on ports 5044, 5000
- Kibana on http://localhost:5601
- Grafana on http://localhost:3000

### Step 2: Start Your LiveQuiz Application

```bash
cd BACKEND
node server.js
```

The application will:
- Start on port 4000
- Expose metrics at http://localhost:4000/metrics
- Write logs to `BACKEND/logs/app.log`

### Step 3: Verify Services

```bash
# Check all containers are running
docker-compose ps

# Expected output should show all services as "Up"
```

### Step 4: Stop Services

When done:

```bash
# Stop all monitoring services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

---

## 💻 Running Locally (Without Docker)

If you prefer to run Prometheus and Logstash locally without Docker:

### Option A: Install Prometheus Locally

**Windows:**
```powershell
# Download Prometheus from https://prometheus.io/download/
# Extract to a directory
cd path\to\prometheus

# Copy your prometheus.yml to the prometheus directory
# Edit prometheus.yml and change target from 'host.docker.internal:4000' to 'localhost:4000'

# Start Prometheus
.\prometheus.exe --config.file=prometheus.yml
```

**Linux/Mac:**
```bash
# Download and extract Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Copy your prometheus.yml
cp /path/to/your/prometheus.yml .

# Edit target to use localhost instead of host.docker.internal
sed -i 's/host.docker.internal/localhost/g' prometheus.yml

# Start Prometheus
./prometheus --config.file=prometheus.yml
```

### Option B: Install Logstash Locally

**Windows:**
```powershell
# Download Logstash from https://www.elastic.co/downloads/logstash
# Extract to a directory

# Update paths in logstash.conf to use Windows paths
# path => "C:/Users/akshi/OneDrive/Desktop/L/BACKEND/logs/app.log"

# Start Logstash
.\bin\logstash.bat -f path\to\logstash.conf
```

### Option C: Metrics Only (No Visualization)

You can run just the application with metrics endpoint:

```bash
cd BACKEND
npm install prom-client winston
node server.js
```

Then manually check metrics:
```bash
curl http://localhost:4000/metrics
```

---

## ✅ Verification Steps

### 1. Verify Metrics Endpoint

```bash
# Test metrics endpoint
curl http://localhost:4000/metrics

# Or open in browser
# http://localhost:4000/metrics
```

**Expected Output:**
```
# HELP livequiz_logins_total Total number of login attempts
# TYPE livequiz_logins_total counter
livequiz_logins_total{role="teacher",status="success"} 0

# HELP livequiz_http_requests_total Total number of HTTP requests
# TYPE livequiz_http_requests_total counter
livequiz_http_requests_total{method="GET",route="/metrics",status="200"} 1
...
```

### 2. Verify Prometheus is Scraping

1. Open Prometheus UI: http://localhost:9090
2. Go to **Status > Targets**
3. Verify `livequiz-backend` target is **UP** (green)
4. Go to **Graph** tab
5. Run query: `livequiz_logins_total`

### 3. Test Login Metrics

```bash
# Perform a login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"rid":"S001","password":"student123"}'

# Check metrics updated
curl http://localhost:4000/metrics | grep livequiz_logins_total
```

Expected to see counter incremented:
```
livequiz_logins_total{role="student",status="success"} 1
```

### 4. Verify Logs are Being Written

```bash
# Check log file exists and has content
cat BACKEND/logs/app.log

# Watch logs in real-time
tail -f BACKEND/logs/app.log
```

**Expected Output (JSON format):**
```json
{"level":"info","message":"User login successful","service":"livequiz-backend","timestamp":"2025-12-02 22:50:00","metadata":{"event":"user_login","rid":"S001","role":"student","success":true}}
```

### 5. Verify Logstash is Processing Logs

```bash
# Check Logstash is running
curl http://localhost:9600/_node/stats

# Check Elasticsearch has received logs
curl http://localhost:9200/livequiz-logs-*/_search?pretty

# Or check in Logstash container logs
docker-compose logs logstash
```

### 6. Verify Kibana Visualization

1. Open Kibana: http://localhost:5601
2. Go to **Management > Stack Management > Index Patterns**
3. Create index pattern: `livequiz-logs-*`
4. Set time field: `@timestamp`
5. Go to **Discover** to view logs
6. You should see structured logs with all fields (level, message, event, etc.)

### 7. Full Integration Test

Run a complete workflow and verify everything is tracked:

```bash
# 1. Login as teacher
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"rid":"T001","password":"teacher123"}'

# Save the token from response
TOKEN="your-jwt-token-here"

# 2. Create a quiz
curl -X POST http://localhost:4000/api/quiz/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"quiz":[{"question":"Test?","options":["A","B"],"correct":0}]}'

# 3. Check Prometheus metrics
curl http://localhost:4000/metrics | grep -E "livequiz_(logins|quizzes_created)"

# 4. Check logs
cat BACKEND/logs/app.log | grep -E "(user_login|quiz_created)"
```

---

## 📊 Grafana Dashboard Setup (Optional)

Grafana provides beautiful visualizations for Prometheus metrics.

### Step 1: Access Grafana

1. Open http://localhost:3000
2. Login with:
   - Username: `admin`
   - Password: `admin`
3. Skip password change (or set a new one)

### Step 2: Add Prometheus Data Source

1. Go to **Configuration > Data Sources**
2. Click **Add data source**
3. Select **Prometheus**
4. Set URL: `http://prometheus:9090`
5. Click **Save & Test**

### Step 3: Import Dashboard

Create a new dashboard with these panels:

**Panel 1: Total Logins**
- Query: `sum(livequiz_logins_total)`
- Visualization: Stat
- Title: "Total Logins"

**Panel 2: Login Success Rate**
- Query: `sum(livequiz_logins_total{status="success"}) / sum(livequiz_logins_total) * 100`
- Visualization: Gauge
- Title: "Login Success Rate (%)"

**Panel 3: HTTP Request Duration**
- Query: `histogram_quantile(0.95, rate(livequiz_http_request_duration_seconds_bucket[5m]))`
- Visualization: Graph
- Title: "95th Percentile Request Duration"

**Panel 4: Requests per Second**
- Query: `rate(livequiz_http_requests_total[1m])`
- Visualization: Graph
- Title: "Requests/Second"

**Panel 5: Quiz Activity**
- Query: `livequiz_quizzes_created_total` and `livequiz_quizzes_submitted_total`
- Visualization: Stat
- Title: "Quiz Activity"

### Step 4: Save Dashboard

1. Click **Save dashboard** (disk icon)
2. Name it "LiveQuiz Application Metrics"
3. Set auto-refresh to 5s or 10s

---

## 🔧 Troubleshooting

### Issue: Prometheus shows target as DOWN

**Check 1:** Ensure your application is running
```bash
curl http://localhost:4000/metrics
```

**Check 2:** If using Docker, verify prometheus.yml uses correct target
```yaml
# Should be:
targets: ['host.docker.internal:4000']

# NOT:
targets: ['localhost:4000']
```

**Check 3:** Check Prometheus logs
```bash
docker-compose logs prometheus
```

---

### Issue: No logs appearing in Elasticsearch

**Check 1:** Verify log file exists
```bash
ls -la BACKEND/logs/app.log
```

**Check 2:** Verify Logstash is reading the file
```bash
docker-compose logs logstash | grep "app.log"
```

**Check 3:** Verify file path in logstash.conf matches volume mount
```bash
# In docker-compose.yml, logs are mounted as:
# ./BACKEND/logs:/usr/share/logstash/logs

# In logstash.conf, path should be:
# path => "/usr/share/logstash/logs/app.log"
```

**Check 4:** Check Elasticsearch is running
```bash
curl http://localhost:9200/_cluster/health
```

**Check 5:** Manually check if indices were created
```bash
curl http://localhost:9200/_cat/indices?v
```

---

### Issue: Cannot access Kibana

**Check 1:** Verify Kibana is running
```bash
docker-compose ps kibana
```

**Check 2:** Check Kibana logs
```bash
docker-compose logs kibana
```

**Check 3:** Wait for Elasticsearch to be fully ready
```bash
# Kibana needs Elasticsearch to be healthy
curl http://localhost:9200/_cluster/health
```

---

### Issue: Logs directory not created

The logs directory should be created automatically by Winston. If not:

```bash
# Create manually
mkdir -p BACKEND/logs
chmod 755 BACKEND/logs
```

---

### Issue: Permission denied for logs in Docker

If Logstash cannot read log files:

```bash
# Linux/Mac: Fix permissions
chmod -R 755 BACKEND/logs

# Windows: Ensure Docker has access to the shared drive
# Docker Desktop > Settings > Resources > File Sharing
```

---

## 🚀 Production Considerations

### 1. Secure the /metrics Endpoint

Add authentication to prevent unauthorized access:

```javascript
// In server.js
app.get("/metrics", auth, async (req, res) => {
  // Now requires JWT token
  // Or use basic auth specifically for Prometheus
});
```

### 2. Log Rotation

Winston is configured with log rotation (max 10MB, 5 files). Adjust as needed:

```javascript
// In config/logger.js
maxsize: 10485760,  // 10MB
maxFiles: 5,
```

### 3. Metric Cardinality

Avoid high cardinality labels (e.g., don't use user IDs as labels). Current implementation is safe.

### 4. Elasticsearch Index Management

Set up Index Lifecycle Management (ILM) to automatically delete old logs:

```bash
# Example: Keep logs for 30 days
curl -X PUT "localhost:9200/_ilm/policy/livequiz-logs-policy" \
  -H 'Content-Type: application/json' \
  -d '{"policy":{"phases":{"delete":{"min_age":"30d","actions":{"delete":{}}}}}}'
```

### 5. Alert Rules

Create Prometheus alerting rules in `prometheus.yml`:

```yaml
rule_files:
  - "alert_rules.yml"
```

Example alert rule:
```yaml
# alert_rules.yml
groups:
  - name: livequiz_alerts
    rules:
      - alert: HighLoginFailureRate
        expr: rate(livequiz_logins_total{status="failure"}[5m]) > 10
        for: 2m
        annotations:
          summary: "High login failure rate detected"
```

### 6. Resource Limits

For production, set resource limits in docker-compose.yml:

```yaml
services:
  elasticsearch:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### 7. Persistent Storage

Current setup uses Docker volumes. For production, consider:
- Network-attached storage
- Cloud storage (AWS EBS, Azure Disk)
- Regular backups of Elasticsearch data

### 8. Security Hardening

- Enable Elasticsearch security (xpack.security.enabled=true)
- Use HTTPS for all services
- Set strong passwords
- Implement network segmentation
- Use secrets management (Docker secrets, Kubernetes secrets)

---

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Logstash Documentation](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [prom-client Documentation](https://github.com/siimon/prom-client)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)

---

## 🎉 Summary

You now have a complete monitoring and logging solution:

✅ **Prometheus** collecting real-time metrics
✅ **Winston** writing structured JSON logs
✅ **Logstash** processing and enriching logs
✅ **Elasticsearch** storing logs
✅ **Kibana** visualizing logs
✅ **Grafana** visualizing metrics

All integrated into your LiveQuiz application with zero breaking changes!
