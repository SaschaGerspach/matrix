#!/bin/bash
set -e

CERT_DIR="$(cd "$(dirname "$0")" && pwd)/ssl"
mkdir -p "$CERT_DIR"

if [ -f "$CERT_DIR/cert.pem" ] && [ -f "$CERT_DIR/key.pem" ]; then
    echo "Certificates already exist in $CERT_DIR"
    exit 0
fi

export MSYS_NO_PATHCONV=1
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/key.pem" \
    -out "$CERT_DIR/cert.pem" \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Self-signed certificate generated in $CERT_DIR"
