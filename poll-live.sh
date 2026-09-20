#!/bin/bash
# 녹음 중인 노트의 paragraphs가 실시간으로 늘어나는지 확인한다. 사용: TIRO_API_KEY=... ./poll-live.sh
B=https://api.tiro.ooo/v1/external; H="Authorization: Bearer ${TIRO_API_KEY:?TIRO_API_KEY required}"
W=$(curl -s -H "$H" $B/workspaces/me | python3 -c 'import json,sys;print(json.load(sys.stdin)["guid"])')
while :; do
  curl -s -H "$H" "$B/workspaces/$W/notes?size=1" | python3 -c '
import json,sys;n=json.load(sys.stdin)["content"][0];print(n["guid"],n.get("recordingEndAt"))' | {
    read N END
    curl -s -H "$H" "$B/notes/$N/paragraphs?size=1000" | python3 -c '
import json,sys,datetime;p=json.load(sys.stdin)["content"];l=p[-1] if p else {}
print(datetime.datetime.now().strftime("%H:%M:%S"),sys.argv[1],"ended="+sys.argv[2],"n=%d"%len(p),"lastTo=%s"%l.get("timeTo"),"tail=%r"%((l.get("transcript") or {}).get("content","")[-40:]))' "$N" "$END"
  }
  sleep 3
done
