#!/usr/bin/env bash
# SSH tunnel to production Temporal on Render (private service).
#
# Prereqs:
#   - Render CLI: render login
#   - SSH public key: https://dashboard.render.com/u/settings#ssh-public-keys
#
# While this runs:
#   - Browser UI:  http://localhost:8080
#   - gRPC:        localhost:7233
#
# Temporal CLI (another terminal):
#   TEMPORAL_ADDRESS=localhost:7233 TEMPORAL_NAMESPACE=default temporal workflow list
#
# Docs: clinic-reminder-system/clinic-reminder-system-render-deployment.md

set -euo pipefail

echo "Opening SSH tunnel to Render service 'temporal'..."
echo "  UI:   http://localhost:8080"
echo "  gRPC: localhost:7233  (namespace: default)"
echo ""
echo "Keep this terminal open. Ctrl+C to close."
echo ""

exec render ssh temporal -- -L 8080:localhost:8080 -L 7233:localhost:7233
