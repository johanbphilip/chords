#!/usr/bin/env bash
# Prints a random 48-character secret, suitable for BETTER_AUTH_SECRET.
openssl rand -base64 36
