ARG BASE_IMAGE=mcr.microsoft.com/playwright@sha256:941cc91e5022880ac1d14ae90b476b624deb6399dbbc28d612d5d5bd7928fcbd
FROM ${BASE_IMAGE} AS baseline
USER root
RUN npm install --prefix /opt/runtime --no-audit --no-fund @openai/codex@0.153.4 playwright@1.62.1 && npm cache clean --force
COPY container.mjs connect-proxy.mjs OPERATING.md /opt/runtime/
ENV PATH="/opt/runtime/node_modules/.bin:${PATH}"
WORKDIR /task
USER pwuser

FROM baseline AS impeccable
USER root
RUN npm install --prefix /opt/assistance --no-audit --no-fund impeccable@4.1.0 && npm cache clean --force
ENV PATH="/opt/assistance/node_modules/.bin:${PATH}"
ENV IMPECCABLE_BIN=/opt/assistance/node_modules/@impeccable/cli-linux-arm64/bin/impeccable
USER pwuser

FROM baseline AS viewrule
USER root
COPY engine.tgz /tmp/engine.tgz
COPY plugin /opt/plugin
COPY install-viewrule.mjs /tmp/install-viewrule.mjs
RUN node /tmp/install-viewrule.mjs && rm /tmp/engine.tgz /tmp/install-viewrule.mjs && npm cache clean --force
ENV CLAUDE_PLUGIN_ROOT=/opt/plugin
ENV VIEWRULE_PLUGIN_DATA_DIR=/opt/assistance
USER pwuser
