#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
WORKSPACE_DISPATCHER="$SCRIPT_DIR/../../../../aibot-api/scripts/development/dispatch-heavy-task.sh"

if [ -x "$WORKSPACE_DISPATCHER" ]; then
  exec "$WORKSPACE_DISPATCHER" "$@"
fi

task='heavy task'

while [ "$#" -gt 0 ]; do
  case "$1" in
    --repo)
      [ "$#" -ge 2 ] || break
      shift 2
      ;;
    --task)
      [ "$#" -ge 2 ] || break
      task="$2"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      shift
      ;;
  esac
done

is_truthy() {
  case "${1:-}" in
    '' | 0 | false | FALSE | no | NO | off | OFF)
      return 1
      ;;
    *)
      return 0
      ;;
  esac
}

if is_truthy "${HEAVY_TASK_GATE_ACTIVE:-}" ||
  is_truthy "${CI:-}" ||
  [ -f /.dockerenv ]; then
  [ "$#" -gt 0 ] || {
    printf '[heavy-task-gate] error: a command is required after --\n' >&2
    exit 2
  }
  exec "$@"
fi

[ "$#" -gt 0 ] || {
  printf '[heavy-task-gate] error: a command is required after --\n' >&2
  exit 2
}

lock_base="${TMPDIR:-/tmp}/aibot-frontend-heavy-task"

if command -v flock >/dev/null 2>&1; then
  exec 9>"$lock_base.lock"
  flock -n 9 || {
    printf '[heavy-task-gate] error: another frontend heavy task is running (%s).\n' "$task" >&2
    exit 2
  }
  HEAVY_TASK_GATE_ACTIVE=1 "$@"
  exit $?
fi

lock_dir="$lock_base.lock.d"
if ! mkdir "$lock_dir" 2>/dev/null; then
  lock_owner="$(sed -n '1p' "$lock_dir/pid" 2>/dev/null || true)"
  case "$lock_owner" in
    ''|*[!0-9]*) lock_owner='' ;;
  esac
  if [ -n "$lock_owner" ] && kill -0 "$lock_owner" 2>/dev/null; then
    printf '[heavy-task-gate] error: another frontend heavy task is running (%s).\n' "$task" >&2
    exit 2
  fi
  rm -f "$lock_dir/pid"
  rmdir "$lock_dir" 2>/dev/null || {
    printf '[heavy-task-gate] error: stale heavy-task lock cannot be recovered.\n' >&2
    exit 2
  }
  mkdir "$lock_dir" 2>/dev/null || {
    printf '[heavy-task-gate] error: another frontend heavy task started concurrently.\n' >&2
    exit 2
  }
fi
printf '%s\n' "$$" > "$lock_dir/pid"
cleanup_lock() {
  rm -f "$lock_dir/pid"
  rmdir "$lock_dir" 2>/dev/null || true
}
trap cleanup_lock EXIT
trap 'exit 130' HUP INT TERM
HEAVY_TASK_GATE_ACTIVE=1 "$@"
