#!/bin/sh
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMEOUT=30

passed=0
failed=0
active_project=""
active_compose=""

cleanup() {
    if [ -n "$active_project" ] && [ -n "$active_compose" ]; then
        docker compose -p "$active_project" -f "$active_compose" down -v --timeout 5 >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT INT TERM

run_scenario() {
    name="$1"
    compose_file="$2"
    project="brespi-test-${name}"
    active_project="$project"
    active_compose="$compose_file"

    printf "\n  TEST  %s\n" "$name"

    # Start the scenario
    docker compose -p "$project" -f "$compose_file" up -d --wait-timeout "$TIMEOUT" 2>/dev/null

    # Poll for startup message or failure
    elapsed=0
    while [ "$elapsed" -lt "$TIMEOUT" ]; do
        logs=$(docker compose -p "$project" -f "$compose_file" logs brespi 2>&1)

        if printf "%s" "$logs" | grep -q "Brespi started"; then
            printf "%s\n" "$logs"
            printf "  PASS  %s\n" "$name"
            passed=$((passed + 1))
            docker compose -p "$project" -f "$compose_file" down -v --timeout 5 >/dev/null 2>&1
            active_project=""
            active_compose=""
            return 0
        fi

        # Check if the container exited (nonzero exit = crash)
        if ! docker compose -p "$project" -f "$compose_file" ps --status running 2>/dev/null | grep -q brespi; then
            printf "%s\n" "$logs"
            printf "  FAIL  %s (container exited)\n" "$name"
            failed=$((failed + 1))
            docker compose -p "$project" -f "$compose_file" down -v --timeout 5 >/dev/null 2>&1
            active_project=""
            active_compose=""
            return 1
        fi

        sleep 1
        elapsed=$((elapsed + 1))
    done

    docker compose -p "$project" -f "$compose_file" logs brespi 2>&1
    printf "  FAIL  %s (timeout after %ds)\n" "$name" "$TIMEOUT"
    failed=$((failed + 1))
    docker compose -p "$project" -f "$compose_file" down -v --timeout 5 >/dev/null 2>&1
    active_project=""
    active_compose=""
    return 1
}

# ─── scenarios ───

cd "$ROOT"

printf "\nBuilding default image...\n"
./brespi.sh image create --postgresql --mariadb
run_scenario "default" "$SCRIPT_DIR/compose.yaml"

printf "\nBuilding custom-alpine image...\n"
./brespi.sh image create --dockerfile "$SCRIPT_DIR/custom-alpine.Dockerfile"
run_scenario "custom-alpine" "$SCRIPT_DIR/compose.yaml"

printf "\nBuilding custom-ubuntu image...\n"
./brespi.sh image create --dockerfile "$SCRIPT_DIR/custom-ubuntu.Dockerfile"
run_scenario "custom-ubuntu" "$SCRIPT_DIR/compose.yaml"

# ─── summary ───

printf "\n  %d passed, %d failed\n\n" "$passed" "$failed"
[ "$failed" -eq 0 ]
