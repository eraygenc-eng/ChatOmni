FROM node:22-bookworm-slim

# Creates a non-root user for code execution.
RUN useradd \
    --create-home \
    --uid 10001 \
    sandbox

WORKDIR /sandbox

USER sandbox

CMD ["node", "-"]