##################################################
## https://github.com/denoland/deno_docker/blob/main/ubuntu.dockerfile
##################################################
ARG DENO_VERSION=1.31.3
ARG BIN_IMAGE=denoland/deno:bin-${DENO_VERSION}

FROM ${BIN_IMAGE} AS bin
FROM buildpack-deps:20.04-curl AS tini

ARG TINI_VERSION=0.19.0
RUN curl -fsSL https://github.com/krallin/tini/releases/download/v${TINI_VERSION}/tini \
    --output /tini \
  && chmod +x /tini

FROM ubuntu:22.04

RUN useradd --uid 1993 --user-group deno \
  && mkdir /deno-dir/ \
  && chown deno:deno /deno-dir/

ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL_ROOT /usr/local

ARG DENO_VERSION
ENV DENO_VERSION=${DENO_VERSION}
COPY --from=bin /deno /usr/bin/deno

##################################################
## Install app/server
##################################################
RUN mkdir -p /opt/pippi
WORKDIR "/opt/pippi"

# Cache the dependencies as a layer
COPY deps.ts .
RUN deno cache deps.ts

# Only copy selected resources to the Docker image
COPY base/ ./base/
COPY controllers/ ./controllers/
COPY static/ ./static/
COPY utils/ ./utils/
COPY server.ts .

# Copy env files
COPY .env .env

RUN ls -la .

# Compile the app
RUN deno cache server.ts

##################################################
## Run server
##################################################
EXPOSE 8000
USER deno
ENV ENV_PATH /opt/pippi/.env

ENTRYPOINT ["deno"]
CMD ["run", "--allow-env", "--allow-read", "--allow-net", "server.ts"]