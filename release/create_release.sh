#!/bin/bash

path="/home/parlot"

pkg -t node16-linux "$path/worker/worker.js"
mv worker "$path/release/parlot-worker"
chmod +x "$path/release/parlot-worker"
zip -m "$path/release/parlot-worker-linux.zip" "$path/release/parlot-worker"

pkg -t node16-macos "$path/worker/worker.js"
mv worker "$path/release/parlot-worker"
chmod +x "$path/release/parlot-worker"
zip -m "$path/release/parlot-worker-macos.zip" "$path/release/parlot-worker"

pkg -t node16-windows "$path/worker/worker.js"
mv worker.exe "$path/release/parlot-worker.exe"
chmod +x "$path/release/parlot-worker.exe"
zip -m "$path/release/parlot-worker-windows.zip" "$path/release/parlot-worker.exe"