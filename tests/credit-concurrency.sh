#!/usr/bin/env bash
set -euo pipefail
# Only the fresh CI service container is used. No external DB URL.
: "${PG_CONTAINER:?CI postgres container required}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
for i in $(seq 1 20); do
  (docker exec "$PG_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc "set role service_role; select public.nexus_credit_reserve('00000000-0000-4000-8000-000000000002',gen_random_uuid(),500000);" > "$tmp/$i") &
done
wait
accepted=$(grep -hxc 't' "$tmp/"* | awk '{s+=$1} END {print s+0}')
rejected=$(grep -hxc 'f' "$tmp/"* | awk '{s+=$1} END {print s+0}')
test "$accepted" = 10
test "$rejected" = 10
balance=$(docker exec "$PG_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc "select reserved_microusd from public.nexus_credit_wallets where user_id='00000000-0000-4000-8000-000000000002';")
test "$balance" = 5000000
printf 'OK credit concurrency: %s accepted, %s refused, reserved %s micro-USD\n' "$accepted" "$rejected" "$balance"
