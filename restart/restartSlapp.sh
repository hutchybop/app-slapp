#!/bin/bash

FILE="/home/hutch/app-slapp/app.js"
if [ -f "$FILE" ]; then
    tmux kill-session -t app-slapp 2>/dev/null
    tmux new-session -d -s app-slapp
    tmux send-keys -t app-slapp 'cd /home/hutch/app-slapp' C-m
    tmux send-keys -t app-slapp 'rm -rf node_modules' C-m
    tmux send-keys -t app-slapp 'npm i' C-m
    tmux send-keys -t app-slapp '/home/hutch/restart-apps/.hidden_configs/.pushRestart.sh' C-m
    tmux pipe-pane -o -t app-slapp 'cat >> /home/hutch/app-slapp/output.txt'
    tmux send-keys -t app-slapp 'node --trace-warnings app.js' C-m
    tmux set-hook -t app-slapp client-attached 'kill-session -t app-slapp'
else
    exit 1
fi