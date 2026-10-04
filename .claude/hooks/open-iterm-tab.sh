#!/bin/bash
# iTerm2 の新しいタブで Claude Code のセッションを開く(claude attach)。
# 使い方: open-iterm-tab.sh <セッションID>

id="$1"
if ! [[ "$id" =~ ^[0-9a-fA-F-]+$ ]]; then
  echo "セッションIDが不正です: $id" >&2
  exit 1
fi

# claude attach が受け付けるのはジョブID(例: a8a8fe5c)で、セッションIDの完全形ではない。
# claude agents --json でセッションIDからジョブIDを引く。始まった直後で一覧に出ていなければ少し待つ
# タブ名は「<ジョブID> <セッション名>」にする。通知をクリックしたとき、ジョブIDでこのタブを探す
# (始まった直後はセッション名がまだ決まっていないことがあるため)
job_id=""; name=""
for _ in 1 2 3 4 5; do
  IFS=$'\t' read -r job_id name < <(claude agents --json 2>/dev/null \
    | jq -r --arg id "$id" '.[] | select(.sessionId == $id or .id == $id) | [.id, (.name // "")] | @tsv' | head -1)
  [ -n "$job_id" ] && break
  sleep 1
done
job_id=${job_id:-${id:0:8}}

osascript - "claude attach $job_id" "$job_id $name" <<'APPLESCRIPT'
on run argv
  set cmd to item 1 of argv
  set tabName to item 2 of argv
  tell application "iTerm2"
    activate
    if (count of windows) is 0 then
      set w to (create window with default profile)
    else
      set w to current window
      tell w to create tab with default profile
    end if
    tell current session of w
      set name to tabName
      write text cmd
    end tell
  end tell
end run
APPLESCRIPT
