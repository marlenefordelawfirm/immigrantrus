# Use the official TwentyCRM image as base
FROM twentycrm/twenty:latest

# Set working directory
WORKDIR /app

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl --fail http://localhost:3000/healthz || exit 1

# Start the application
CMD ["yarn", "start:prod"]
