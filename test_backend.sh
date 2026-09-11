#!/bin/bash
# Quick test of backend routes

echo "=== Testing NavHub backend routes ==="

# Start backend in background
cd /home/yunis__147/NavHub/backend
npm start &
BACKEND_PID=$!

# Wait for server to start
sleep 3

echo ""
echo "1. GET /api/state"
curl -s http://localhost:5000/api/state | python3 -m json.tool

echo ""
echo "2. POST /api/control/acquire"
curl -s -X POST http://localhost:5000/api/control/acquire -H "Content-Type: application/json" | python3 -m json.tool

# Get token from previous response
TOKEN=$(curl -s -X POST http://localhost:5000/api/control/acquire -H "Content-Type: application/json" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "Got token: $TOKEN"

echo ""
echo "3. POST /api/maps/list"
curl -s http://localhost:5000/api/maps | python3 -m json.tool

echo ""
echo "4. Try to save map (should fail without mapping mode)"
curl -s -X POST http://localhost:5000/api/maps/save \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"name\": \"test_map\"}" \
  | python3 -m json.tool

# Kill backend
kill $BACKEND_PID 2>/dev/null
wait $BACKEND_PID 2>/dev/null

echo ""
echo "=== Test complete ==="