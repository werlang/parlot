#!/bin/bash

path="/home/parlot"

pkg -t node16-linux "$path/worker/worker.js"
mv worker "$path/release/linux/parlot-worker"

pkg -t node16-macos "$path/worker/worker.js"
mv worker "$path/release/macos/parlot-worker"

pkg -t node16-windows "$path/worker/worker.js"
mv worker.exe "$path/release/windows/parlot-worker.exe"

chmod +x "$path/release/linux/parlot-worker"
chmod +x "$path/release/macos/parlot-worker"
chmod +x "$path/release/windows/parlot-worker.exe"