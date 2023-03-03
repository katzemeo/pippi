@echo off
rem set NO_COLOR=true
set ENV_PATH=.env
deno run --allow-net=:80 --allow-env --allow-read --location http://localhost:8000 --watch server.ts