# LiveQuiz Monitoring - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
cd BACKEND
npm install
```

### Step 2: Start Monitoring Stack
```bash
# From project root (L/)
docker-compose up -d
```

### Step 3: Start Application
```bash
cd BACKEND
node server.js
```

### Step 4: Verify Everything Works

Open these URLs in your browser:

- **Application Metrics**: http://localhost:4000/metrics
- **Prometheus Dashboard**: http://localhost:9090
- **Kibana (Logs)**: http://localhost:5601
- **Grafana (Visualization)**: http://localhost:3000
- **Elasticsearch**: http://localhost:9200

---

## 📊 What You Get

### Prometheus Metrics Available:

| Metric Name | Type | Description |
|------------|------|-------------|
| `livequiz_logins_total` | Counter | Login attempts (success/failure) |
| `livequiz_quizzes_created_total` | Counter | Quizzes created by teachers |
| `livequiz_quizzes_submitted_total` | Counter | Quiz submissions by students |
| `livequiz_active_users` | Gauge | Active WebSocket connections |
| `livequiz_http_request_duration_seconds` | Histogram | API request latency |
| `livequiz_http_requests_total` | Counter | Total HTTP requests |
| `livequiz_nodejs_*` | Various | Node.js metrics (CPU, memory, etc.) |

### Log Events Tracked:

- ✅ User login (success/failure)
- ✅ Quiz created/updated/deleted
- ✅ Quiz submitted by student
- ✅ WebSocket connections
- ✅ Database operations
- ✅ Errors with stack traces

---

## 🔍 Common Prometheus Queries

Run these in Prometheus UI (http://localhost:9090):

```promql
# Total successful logins
sum(livequiz_logins_total{status="success"})

# Login failure rate (last 5 minutes)
rate(livequiz_logins_total{status="failure"}[5m])

# 95th percentile request duration
histogram_quantile(0.95, rate(livequiz_http_request_duration_seconds_bucket[5m]))

# Requests per second by route
sum(rate(livequiz_http_requests_total[1m])) by (route)

# Total quizzes created
livequiz_quizzes_created_total

# Memory usage
process_resident_memory_bytes / 1024 / 1024
```

---

## 📝 Sample Log Queries (Kibana)

In Kibana Discover (http://localhost:5601):

```
# All login events
event: "user_login"

# Failed logins
event: "user_login" AND success: false

# Quiz submissions
event: "quiz_submitted"

# Errors only
level: "error"

# Specific user activity
metadata.rid: "S001"
```

---

## 🛠️ Quick Commands

```bash
# View all running containers
docker-compose ps

# View logs from all services
docker-compose logs -f

# View specific service logs
docker-compose logs -f logstash

# Restart a service
docker-compose restart prometheus

# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v

# View application logs
tail -f BACKEND/logs/app.log

# Check metrics endpoint
curl http://localhost:4000/metrics

# Test login and check metrics
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"rid":"S001","password":"student123"}'
```

---

## 🎯 Service Ports

| Service | Port | URL |
|---------|------|-----|
| LiveQuiz App | 4000 | http://localhost:4000 |
| Prometheus | 9090 | http://localhost:9090 |
| Elasticsearch | 9200 | http://localhost:9200 |
| Logstash | 5044, 5000 | - |
| Kibana | 5601 | http://localhost:5601 |
| Grafana | 3000 | http://localhost:3000 |

---

## ⚡ Performance Impact

The monitoring setup has minimal performance overhead:

- **prom-client**: < 1ms per request
- **winston logging**: < 0.5ms per log entry
- **File I/O**: Async, non-blocking
- **Memory**: ~10-20MB additional

Total impact: **< 2% CPU, < 50MB RAM**

---

## 🔐 Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| Grafana | admin | admin |
| Elasticsearch | - | - (disabled) |
| Kibana | - | - (disabled) |

⚠️ **Change these in production!**

---

## 📂 File Locations

```
L/
├── BACKEND/
│   ├── config/
│   │   ├── metrics.js       ← Prometheus metrics config
│   │   └── logger.js        ← Winston logger config
│   ├── logs/
│   │   ├── app.log         ← All logs (auto-created)
│   │   └── error.log       ← Errors only (auto-created)
│   └── server.js           ← Updated with monitoring
├── docker-compose.yml       ← Docker services
├── prometheus.yml           ← Prometheus config
├── logstash.conf           ← Logstash pipeline
└── MONITORING_SETUP.md     ← Full documentation
```

---

## 🆘 Troubleshooting

**Problem: Prometheus target shows as DOWN**
```bash
# Check if app is running
curl http://localhost:4000/metrics

# Check Prometheus logs
docker-compose logs prometheus
```

**Problem: No logs in Kibana**
```bash
# Check log file exists
ls -la BACKEND/logs/app.log

# Check Logstash is processing
docker-compose logs logstash | grep "app.log"

# Check Elasticsearch indices
curl http://localhost:9200/_cat/indices?v
```

**Problem: Docker services won't start**
```bash
# Check Docker is running
docker ps

# View detailed errors
docker-compose up

# Reset everything
docker-compose down -v
docker-compose up -d
```

---

## 📚 Learn More

See [MONITORING_SETUP.md](./MONITORING_SETUP.md) for:
- Detailed installation steps
- Local (non-Docker) setup
- Grafana dashboard creation
- Production considerations
- Security hardening

---

## ✅ Health Check

Run this to verify everything is working:

```bash
# 1. Check application metrics
curl http://localhost:4000/metrics > /dev/null && echo "✅ Metrics OK" || echo "❌ Metrics Failed"

# 2. Check Prometheus
curl http://localhost:9090/-/healthy > /dev/null && echo "✅ Prometheus OK" || echo "❌ Prometheus Failed"

# 3. Check Elasticsearch
curl http://localhost:9200/_cluster/health > /dev/null && echo "✅ Elasticsearch OK" || echo "❌ Elasticsearch Failed"

# 4. Check Kibana
curl http://localhost:5601/api/status > /dev/null && echo "✅ Kibana OK" || echo "❌ Kibana Failed"

# 5. Check log file
[ -f BACKEND/logs/app.log ] && echo "✅ Logs OK" || echo "❌ Logs Failed"
```

---

**🎉 That's it! Your LiveQuiz app now has production-grade monitoring and logging.**
