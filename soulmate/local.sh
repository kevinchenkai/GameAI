#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/docker/app.env"
COMPOSE_FILE="$SCRIPT_DIR/docker/app.yaml"

# ─── Load env ────────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck source=docker/app.env
source "$ENV_FILE"
set +a

# ─── Pre-checks ──────────────────────────────────────────────────────────────
check_docker() {
  if ! command -v docker &>/dev/null; then
    echo "ERROR: docker not found. Please install Docker first." >&2
    exit 1
  fi
  if ! docker info &>/dev/null; then
    echo "ERROR: Docker daemon is not running." >&2
    exit 1
  fi
}

# ─── Compose wrapper ─────────────────────────────────────────────────────────
compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" "$@"
}

# ─── Commands ─────────────────────────────────────────────────────────────────
cmd_start() {
  check_docker
  echo "==> Starting $PROJECT_NAME (build + detach)..."
  compose up --build -d
  echo "==> Services started."
  echo "    Web: http://localhost:${WEB_PORT}"
  echo "    API: http://localhost:${API_PORT}/api/health"
}

cmd_stop() {
  check_docker
  echo "==> Stopping $PROJECT_NAME..."
  compose down
  echo "==> Stopped."
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_logs() {
  check_docker
  compose logs -f --tail=100 "$@"
}

cmd_status() {
  check_docker
  compose ps
}

cmd_clean() {
  check_docker
  echo "==> Removing containers, images, and volumes for $PROJECT_NAME..."
  compose down --rmi local -v
  echo "==> Cleaned."
}

# ─── Entrypoint ──────────────────────────────────────────────────────────────
usage() {
  echo "Usage: $0 {start|stop|restart|logs|status|clean}"
  echo ""
  echo "  start    Build and start all services"
  echo "  stop     Stop all services"
  echo "  restart  Stop then start"
  echo "  logs     Tail logs (pass service name to filter)"
  echo "  status   Show running containers"
  echo "  clean    Remove containers, local images, and volumes"
}

case "${1:-}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_restart ;;
  logs)    shift; cmd_logs "$@" ;;
  status)  cmd_status ;;
  clean)   cmd_clean ;;
  *)       usage; exit 1 ;;
esac
