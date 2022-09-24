#!/bin/bash

path="/home/parlot"

cd "$path/release" && node create_version.js
cd "$path/worker" && pkg -C Brotli .
rm -f "$path/worker/version.json"

cd "$path/release" && zip -m parlot-worker-linux.zip parlot-worker-linux
cd "$path/release" && zip -m parlot-worker-macos.zip parlot-worker-macos
cd "$path/release" && zip -m parlot-worker-windows.zip parlot-worker-win.exe