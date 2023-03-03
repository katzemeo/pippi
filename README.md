# Pippi - Agile tool for product owners for PI planning and status reporting

## Source
- Git: https://github.com/katzemeo/pippi.git

## Run from terminal (server)
```
Setup local .env file and start the server
- set ENV_PATH=.env.local OR $env:ENV_PATH=".env.local"
- $env:DENO_TLS_CA_STORE="system"

- echo %ENV_PATH% or dir env: or $env:ENV_PATH

- deno run --allow-net=:8000 --allow-env --allow-read --watch server.ts
```

### Browser UI (client)
> http://localhost:8000/public/index.html

### Notes - Downloading external resources for air-gapped environments
- curl https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css --output static/css/bootstrap.css
- curl https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js --output static/bootstrap.bundle.min.js
- curl https://fonts.googleapis.com/icon?family=Material+Icons --output static/css/MaterialIcons.css
- curl https://fonts.gstatic.com/s/materialicons/v139/flUhRq6tzZclQEJ-Vdg-IuiaDsNZ.ttf --output static/css/materialicons.ttf

Manually edit MaterialIcons.css and update link to "materialicons.ttf" as appropriate.