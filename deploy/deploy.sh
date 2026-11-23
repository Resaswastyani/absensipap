#!/usr/bin/env bash
# Update aplikasi di VPS: tarik kode terbaru, install, migrasi, build, restart.
# Jalankan sebagai root:  bash /home/absensi/app/deploy/deploy.sh
set -euo pipefail

APP_DIR=/home/absensi/app
cd "$APP_DIR"

sudo -u absensi git pull --ff-only
sudo -u absensi pnpm install --frozen-lockfile
sudo -u absensi node --env-file=.env scripts/migrate.mjs
sudo -u absensi pnpm build
systemctl restart pap-absensi
sleep 3
systemctl --no-pager --lines=5 status pap-absensi
