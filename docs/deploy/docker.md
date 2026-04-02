# Docker Deployment

Dispatch includes a Docker Compose configuration for running PostgreSQL locally, and can be extended for full production deployments.

## Development Setup

The repository includes a `docker-compose.yml` for local development:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: dispatch
      POSTGRES_PASSWORD: dispatch
      POSTGRES_DB: dispatch
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Start it with:

```bash
docker compose up -d
```

## Production Compose Example

For production, you can extend the compose file to include the Hub and workers:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: dispatch
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: dispatch
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  hub:
    build:
      context: .
      dockerfile: package/hub/Dockerfile
    environment:
      DATABASE_URL: postgresql://dispatch:${POSTGRES_PASSWORD}@postgres:5432/dispatch
      PORT: 3721
      NODE_ENV: production
      REAPER_INTERVAL: 30s
      DISPATCH_DISABLE_DASHBOARD: "false"
    ports:
      - "3721:3721"
    depends_on:
      - postgres
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: package/worker/Dockerfile
    environment:
      HUB_URL: http://hub:3721
    depends_on:
      - hub
    restart: unless-stopped
    deploy:
      replicas: 3

volumes:
  pgdata:
```

## Running Migrations

Before starting the Hub for the first time, run Prisma migrations:

```bash
cd package/hub
bunx prisma migrate deploy
```

In a Docker context, you can run this as an init container or a startup command.

## Scaling Workers

Workers are stateless and can be scaled horizontally:

```bash
docker compose up -d --scale worker=5
```

Each worker instance independently connects to the Hub and claims tasks based on its configured capabilities and concurrency.
