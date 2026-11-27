#!/usr/bin/env bash
# Compares the two columns of `supabase migration list --linked` output.
# usage: check-migration-history.sh <list-file> <strict|allow-pending>
#   remote-only versions (applied in production, missing from the repository) always fail;
#   local-only versions (pending) fail in strict mode.
# Fails closed: output that yields no parsable version is an error, so a CLI
# format change can never turn into "history OK".
set -euo pipefail
file=$1
mode=${2:-strict}
if [ "$mode" != "strict" ] && [ "$mode" != "allow-pending" ]; then
  echo "usage: $0 <list-file> <strict|allow-pending>" >&2
  exit 2
fi
# Columns are separated by ASCII "|" or the box-drawing "│".
parse() {
  awk -F'[|│]' -v want="$1" 'NF >= 3 {
    l = $1; r = $2; gsub(/[[:space:]]/, "", l); gsub(/[[:space:]]/, "", r)
    if (l !~ /^[0-9]*$/ || r !~ /^[0-9]*$/ || (l == "" && r == "")) next
    if (want == "rows") print l "|" r
    else if (want == "remote_only" && l == "") print r
    else if (want == "local_only" && r == "") print l
  }' "$file"
}
rows=$(parse rows | wc -l | tr -d ' ')
if [ "$rows" -eq 0 ]; then
  echo "::error::Could not parse any migration version from the CLI output (format changed?)."
  exit 1
fi
remote_only=$(parse remote_only | tr '\n' ' ')
local_only=$(parse local_only | tr '\n' ' ')
echo "Parsed $rows migration rows."
if [ -n "${remote_only// /}" ]; then
  echo "::error::Applied in production but missing from the repository: $remote_only"
  exit 1
fi
if [ -n "${local_only// /}" ] && [ "$mode" = "strict" ]; then
  echo "::error::Pending migrations not applied to production: $local_only"
  exit 1
fi
echo "Migration history OK${local_only:+ (pending: $local_only)}."
