#!/bin/bash

SALT=$(echo "Y29tcGxleF9zYWx0X3ZhbHVlXzEyMzQ=" | base64 -d)
USER=$(whoami)
HOSTNAME=$(hostname)
DECRYPTION_KEY=$(echo -n "$SALT$USER$HOSTNAME" | sha256sum | head -c 32)

# Encrypt the .config file using AES-256-CBC with PBKDF2
openssl enc -aes-256-cbc -salt -pbkdf2 -in .configSlapp -out .configSlapp.enc -pass pass:$DECRYPTION_KEY