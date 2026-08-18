FROM gcc:16

# Creates a non-root user for code execution.
RUN useradd \
    --create-home \
    --uid 10001 \
    sandbox

WORKDIR /sandbox

USER sandbox

CMD ["bash"]