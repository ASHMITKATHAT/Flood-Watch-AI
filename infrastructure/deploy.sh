#!/bin/bash

# EQUINOX Flood Watch Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/${ENVIRONMENT}_${TIMESTAMP}"

echo "🚀 Deploying EQUINOX Flood Watch to ${ENVIRONMENT} environment..."

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    source ".env.${ENVIRONMENT}"
elif [ -f ".env" ]; then
    source ".env"
else
    echo "❌ No environment file found"
    exit 1
fi

# Create backup directory
mkdir -p "${BACKUP_DIR}"

backup_system() {
    echo "📦 Creating system backup..."
    
    # Backup database
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.prod.yml exec db pg_dump -U "$DB_USER" "$DB_NAME" > "${BACKUP_DIR}/database.sql"
    else
        docker-compose exec db pg_dump -U "$DB_USER" "$DB_NAME" > "${BACKUP_DIR}/database.sql"
    fi
    
    # Backup models and data
    tar -czf "${BACKUP_DIR}/models.tar.gz" backend/models/
    tar -czf "${BACKUP_DIR}/data.tar.gz" backend/data/
    tar -czf "${BACKUP_DIR}/logs.tar.gz" backend/logs/
    
    echo "✅ Backup created in ${BACKUP_DIR}"
}

deploy_backend() {
    echo "🔧 Deploying backend..."
    
    # Build backend image
    docker build -t equinox-backend:latest -f backend/Dockerfile backend/
    
    if [ "$ENVIRONMENT" = "production" ]; then
        # Deploy to production
        docker-compose -f docker-compose.prod.yml down
        docker-compose -f docker-compose.prod.yml pull
        docker-compose -f docker-compose.prod.yml up -d --build
        
        # Run migrations
        docker-compose -f docker-compose.prod.yml exec backend flask db upgrade
    else
        # Deploy to development
        docker-compose down
        docker-compose pull
        docker-compose up -d --build
        
        # Run migrations
        docker-compose exec backend flask db upgrade
    fi
    
    echo "✅ Backend deployed"
}

deploy_frontend() {
    echo "🎨 Deploying frontend..."
    
    # Build frontend
    cd frontend
    npm ci
    npm run build
    
    if [ "$ENVIRONMENT" = "production" ]; then
        # Build production image
        docker build -t equinox-frontend:latest -f Dockerfile.prod .
        
        # Update nginx configuration
        cp ../infrastructure/nginx.conf /etc/nginx/
        cp ../infrastructure/nginx-ssl.conf /etc/nginx/conf.d/default.conf
        
        # Restart nginx
        systemctl restart nginx
    else
        # Restart development container
        docker-compose up -d frontend
    fi
    
    cd ..
    echo "✅ Frontend deployed"
}

run_tests() {
    echo "🧪 Running tests..."
    
    # Backend tests
    cd backend
    python -m pytest tests/ -v --cov=.
    
    # Frontend tests
    cd ../frontend
    npm test -- --coverage
    
    cd ..
    echo "✅ Tests passed"
}

migrate_database() {
    echo "🗄️  Running database migrations..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.prod.yml exec backend flask db upgrade
    else
        docker-compose exec backend flask db upgrade
    fi
    
    echo "✅ Database migrated"
}

restart_services() {
    echo "🔄 Restarting services..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.prod.yml restart backend frontend worker beat
    else
        docker-compose restart backend frontend
    fi
    
    echo "✅ Services restarted"
}

health_check() {
    echo "🏥 Performing health check..."
    
    # Wait for services to start
    sleep 10
    
    # Check backend health
    BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)
    if [ "$BACKEND_HEALTH" = "200" ]; then
        echo "✅ Backend is healthy"
    else
        echo "❌ Backend health check failed: HTTP $BACKEND_HEALTH"
        exit 1
    fi
    
    # Check frontend
    FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
    if [ "$FRONTEND_HEALTH" = "200" ] || [ "$FRONTEND_HEALTH" = "304" ]; then
        echo "✅ Frontend is healthy"
    else
        echo "⚠️  Frontend returned HTTP $FRONTEND_HEALTH (might be building)"
    fi
    
    echo "✅ All health checks passed"
}

cleanup_old_backups() {
    echo "🧹 Cleaning up old backups..."
    
    # Keep only last 5 backups
    ls -dt backups/*/ | tail -n +6 | xargs rm -rf
    
    # Clean old Docker images
    docker image prune -f --filter "until=24h"
    
    echo "✅ Cleanup completed"
}

# Main deployment flow
main() {
    echo "========================================"
    echo " EQUINOX Flood Watch Deployment "
    echo " Environment: ${ENVIRONMENT}"
    echo " Timestamp: ${TIMESTAMP}"
    echo "========================================"
    
    backup_system
    run_tests
    deploy_backend
    deploy_frontend
    migrate_database
    restart_services
    health_check
    cleanup_old_backups
    
    echo "========================================"
    echo "✅ Deployment completed successfully!"
    echo "🌐 Frontend: http://localhost:5173"
    echo "🔧 Backend API: http://localhost:5000"
    echo "📊 Monitoring: http://localhost:3000"
    echo "========================================"
}

# Run main function
main