#!/bin/bash
# メインセッション画面(claude agents)からプロンプトを送って始まったセッションを、
# iTerm2 の新しいタブで開く(claude attach)。
# 使い方: open-tab-on-first-prompt.sh prompt   UserPromptSubmit hook から呼ぶ
#         open-tab-on-first-prompt.sh mark     SessionStart(clear)hook から呼ぶ。
#                                              /clear 後の最初のプロンプトでタブを開かないよう印を付ける

input=$(cat)
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)
[ -z "$session_id" ] && exit 0

marker_dir="${TMPDIR:-/tmp}/claude-tab-opened"
mkdir -p "$marker_dir"

if [ "$1" = "mark" ]; then
  touch "$marker_dir/$session_id"
  exit 0
fi

# iTerm2 のタブで直接動いているセッションは対象外
[ -n "$ITERM_SESSION_ID" ] && exit 0

# 最初のプロンプトのときだけ(まだ Claude の応答がない)
transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)
if [ -f "$transcript" ] && grep -q '"type":"assistant"' "$transcript"; then
  exit 0
fi

# 同じセッションで2回開かない(mkdir が成功した1回だけ進む)
mkdir "$marker_dir/$session_id.lock" 2>/dev/null || exit 0
[ -e "$marker_dir/$session_id" ] && exit 0
touch "$marker_dir/$session_id"

cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
"$(dirname "$0")/open-iterm-tab.sh" "$session_id" "$cwd" >/dev/null 2>&1
exit 0
