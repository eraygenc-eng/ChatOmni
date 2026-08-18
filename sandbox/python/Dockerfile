FROM python:3.12-slim

# Creates a non-root user for code execution.
RUN useradd \
    --create-home \
    --uid 10001 \
    sandbox

WORKDIR /sandbox

USER sandbox

CMD ["python", "-I", "-B", "-u", "-"]