# Example custom Dockerfile for brespi (Ubuntu)
FROM ubuntu:24.04

# Install runtime dependencies (bun ships as a static binary, but needs bash)
RUN apt-get update \
    && apt-get install -y --no-install-recommends bash sqlite3 gosu ca-certificates curl unzip \
    && rm -rf /var/lib/apt/lists/*

# Install bun (single static binary — copy to /usr/local/bin so all users can access it)
RUN curl -fsSL https://bun.sh/install | bash \
    && cp /root/.bun/bin/bun /usr/local/bin/bun

# Create a non-root user to run the app
RUN groupadd --gid 10000 brespi \
    && useradd --uid 10000 --gid brespi --shell /bin/bash --create-home brespi

# Create the data directory and hand it to the bun user
RUN mkdir -p /opt/brespi && chown brespi:brespi /opt/brespi

# Entrypoint that fixes volume-mount ownership on every start,
# then drops privileges to the brespi user via gosu
RUN printf '#!/bin/sh\nchown -R brespi:brespi /opt/brespi\nexec gosu brespi "$@"\n' \
    > /entrypoint.sh && chmod +x /entrypoint.sh

# Copy the built app from the builder stage
WORKDIR /app
COPY --from=builder --chown=brespi:brespi /app .

ENTRYPOINT ["/entrypoint.sh"]
EXPOSE 3000
CMD ["bun", "start:prod"]
