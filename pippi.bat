@echo off
set ENV_PATH=pippi.env
deno run --allow-net --allow-env --allow-read --allow-run --allow-write --location http://localhost:9999 --watch pippi.ts