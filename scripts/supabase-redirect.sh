#!/bin/zsh
# Agrega las URLs del panel a Authentication › Redirect URLs de Supabase
# sin tocar el resto de la configuración. Necesita un token personal:
# https://supabase.com/dashboard/account/tokens
#   SUPABASE_ACCESS_TOKEN=sbp_... ./scripts/supabase-redirect.sh
set -euo pipefail
REF=zjzzqaeusmxmtszgdncl
API=https://api.supabase.com/v1/projects/$REF/config/auth
: "${SUPABASE_ACCESS_TOKEN:?Falta SUPABASE_ACCESS_TOKEN}"
H=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json")

current=$(curl -fsS "${H[@]}" "$API" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("uri_allow_list") or "")')
echo "Antes: ${current:-(vacío)}"
new=$(CUR="$current" python3 -c '
import os
cur = [u.strip() for u in os.environ["CUR"].split(",") if u.strip()]
for u in ("https://clmil0.github.io/agrupay-analytics/", "http://localhost:8765/"):
    if u not in cur: cur.append(u)
print(",".join(cur))')
body=$(NEW="$new" python3 -c 'import json,os; print(json.dumps({"uri_allow_list": os.environ["NEW"]}))')
curl -fsS -X PATCH "${H[@]}" "$API" -d "$body" | python3 -c 'import json,sys; print("Después:", json.load(sys.stdin).get("uri_allow_list"))'
