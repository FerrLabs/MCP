#!/bin/bash
set -e

echo "Initializing FerrFlow MCP development environment..."

# Start services
echo "Starting Docker services..."
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 5

# Check TimescaleDB
until docker exec ferrflow-timescaledb pg_isready -U ferrflow > /dev/null 2>&1; do
  echo "   Waiting for TimescaleDB..."
  sleep 2
done
echo "TimescaleDB ready"

# Check Vault
until docker exec ferrflow-vault vault status > /dev/null 2>&1; do
  echo "   Waiting for Vault..."
  sleep 2
done
echo "Vault ready"

# Check Redis
until docker exec ferrflow-redis redis-cli ping > /dev/null 2>&1; do
  echo "   Waiting for Redis..."
  sleep 2
done
echo "Redis ready"

# Initialize Vault secrets
echo "Initializing Vault secrets..."
export VAULT_ADDR=http://127.0.0.1:8200
export VAULT_TOKEN=dev-root-token

# JWT secret
JWT_SECRET=$(openssl rand -base64 64)
docker exec ferrflow-vault vault kv put secret/ferrflow/api/jwt_secret value="$JWT_SECRET"

echo "Vault secrets initialized"

# Create .env file
echo "Creating .env file..."

cat > .env << EOF
# API URL
API_URL=http://localhost:3000

# Vault
VAULT_ADDR=http://127.0.0.1:8200
VAULT_TOKEN=dev-root-token

# Database
DATABASE_URL=postgresql://ferrflow:ferrflow_dev_password@localhost:5432/ferrflow

# Redis
REDIS_URL=redis://localhost:6379
EOF

echo ".env file created"

echo ""
echo "Development environment initialized!"
echo ""
echo "Services running:"
echo "   - TimescaleDB: postgresql://ferrflow:ferrflow_dev_password@localhost:5432/ferrflow"
echo "   - Vault: http://127.0.0.1:8200 (token: dev-root-token)"
echo "   - Redis: redis://localhost:6379"
echo ""
echo "Next steps:"
echo "   pnpm install"
echo "   pnpm dev"
echo ""
