#!/bin/bash

path="/home/parlot"

pkg -t node16-linux,node16-macos,node16-windows "$path/worker/worker.js" --out-path "$path/release"
zip -m "$path/release/parlot-worker-linux.zip" "$path/release/worker-linux"
zip -m "$path/release/parlot-worker-macos.zip" "$path/release/worker-macos"
zip -m "$path/release/parlot-worker-windows.zip" "$path/release/worker-win.exe"