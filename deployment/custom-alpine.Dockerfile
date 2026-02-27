# Example custom Dockerfile for brespi (Alpine)
FROM oven/bun:alpine

# Install runtime dependencies
RUN apk update && apk add --no-cache bash su-exec

# Create the data directory and hand it to the bun user
RUN mkdir -p /opt/brespi && chown bun:bun /opt/brespi

# Entrypoint that fixes volume-mount ownership on every start,
# then drops privileges to the bun user via su-exec
RUN printf '#!/bin/sh\nchown -R bun:bun /opt/brespi\nexec su-exec bun "$@"\n' \
    > /entrypoint.sh && chmod +x /entrypoint.sh

# Copy the built app from the builder stage
WORKDIR /app
COPY --from=builder --chown=bun:bun /app .

ENTRYPOINT ["/entrypoint.sh"]
EXPOSE 3000
CMD ["bun", "start:prod"]
