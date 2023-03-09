#!/bin/sh

# Note: if behind a proxy, make sure to set the appropriate HTTP_PROXY, HTTPS_PROXY, env variables etc.
# In addition, if you encounter certificate errors, specify the --cert <CA_CERT.PEM> to resolve unknown cert errors
# OR set DENO_TLS_CA_STORE="system" (if appropriate) to use system specific CA certs for Deno.
# As a last resort, you can temporarily specify --unsafely-ignore-certificate-errors to download & cache resources.

#setproxy
#export DENO_TLS_CA_STORE="system"
deno run --allow-net=:80 --allow-env --allow-read --location http://localhost:8000 --watch server.ts