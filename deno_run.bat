@echo off
rem set NO_COLOR=true
set ENV_PATH=.env

rem set DENO_TLS_CA_STORE=mozilla
rem deno run --allow-net=:80 --allow-env --allow-read --location https://localhost:8000 --watch --cert ./etc/localhost.crt server.ts

deno run --allow-net --allow-env --allow-read --watch server.ts
