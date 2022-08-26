#!/bin/bash

pkg ../worker/worker.js
mv worker-linux linux/parlot-worker
mv worker-macos macos/parlot-worker
mv worker-win.exe windows/parlot-worker.exe

chmod +x linux/parlot_worker
chmod +x macos/parlot_worker
chmod +x windows/parlot_worker.exe