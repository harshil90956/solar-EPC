#!/bin/bash

# ============================================================
# SOLAR EPC - LIVE DEPLOYMENT SCRIPT
# ============================================================
# Run this script to deploy both backend and frontend live
# ============================================================

echo "=========================================="
echo "  SOLAR EPC - LIVE DEPLOYMENT"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================
# STEP 1: CHECK PREREQUISITES
# ============================================================
echo -e "${YELLOW}Step 1: Checking Prerequisites...${NC}"
echo "------------------------------------------"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Download from: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version:${NC} $(node --version)"
echo -e "${GREEN}✓ npm version:${NC} $(npm --version)"

# ============================================================
# STEP 2: BACKEND DEPLOYMENT (Railway)
# ============================================================
echo ""
echo -e "${YELLOW}Step 2: Backend Deployment to Railway${NC}"
echo "------------------------------------------"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

cd backend

echo "Building backend..."
npm install
npm run build

echo ""
echo "Deploying to Railway..."
echo "You will need to:"
echo "1. Login to Railway when prompted"
echo "2. Create a new project or select existing"
echo "3. Add MongoDB database from Railway dashboard"
echo ""

# Deploy to Railway
railway login
railway init
railway up

BACKEND_URL=$(railway status | grep "Domain" | awk '{print $2}')
echo -e "${GREEN}✓ Backend deployed at: ${BACKEND_URL}${NC}"

cd ..

# ============================================================
# STEP 3: UPDATE FRONTEND ENV
# ============================================================
echo ""
echo -e "${YELLOW}Step 3: Updating Frontend Environment${NC}"
echo "------------------------------------------"

# Update .env.production with backend URL
if [ -n "$BACKEND_URL" ]; then
    echo "REACT_APP_API_BASE_URL=https://$BACKEND_URL/api" > frontend/.env.production
    echo -e "${GREEN}✓ Updated REACT_APP_API_BASE_URL${NC}"
else
    echo -e "${YELLOW}⚠ Please manually update frontend/.env.production${NC}"
    echo "   Set REACT_APP_API_BASE_URL to your Railway backend URL"
fi

# ============================================================
# STEP 4: FRONTEND BUILD
# ============================================================
echo ""
echo -e "${YELLOW}Step 4: Building Frontend${NC}"
echo "------------------------------------------"

cd frontend

echo "Installing dependencies..."
npm install

echo "Building for production..."
npm run build

if [ -d "build" ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

cd ..

# ============================================================
# STEP 5: FRONTEND DEPLOYMENT (Netlify)
# ============================================================
echo ""
echo -e "${YELLOW}Step 5: Frontend Deployment to Netlify${NC}"
echo "------------------------------------------"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

cd frontend

echo "Deploying to Netlify..."
echo "You will need to:"
echo "1. Login to Netlify when prompted"
echo "2. Follow the prompts to deploy"
echo ""

netlify deploy --prod --dir=build

cd ..

# ============================================================
# DEPLOYMENT COMPLETE
# ============================================================
echo ""
echo "=========================================="
echo -e "${GREEN}  🎉 DEPLOYMENT COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Your Solar EPC app is now LIVE!"
echo ""
echo "Backend API: Check Railway dashboard"
echo "Frontend: Check Netlify dashboard"
echo ""
echo "=========================================="
