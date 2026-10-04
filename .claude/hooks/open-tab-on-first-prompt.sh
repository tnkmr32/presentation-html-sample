#!/bin/bash
# メインセッション画面(claude agents)からプロンプトを送って始まったセッションを、
# ターミナルの新しいタブで開く(claude attach)。macOS は iTerm2、Windows(WSL・Git Bash)は Windows Terminal。
# 使い方: open-tab-on-first-prompt.sh prompt   UserPromptSubmit hook から呼ぶ
#         open-tab-on-first-prompt.sh mark     SessionStart(clear)hook から呼ぶ。
#                                              /clear 後の最初のプロンプトでタブを開かないよう印を付ける

input=$(cat)
# 対応するターミナルがない環境(Linux など)では何もしない
command -v osascript >/dev/null 2>&1 || command -v wt.exe >/dev/null 2>&1 || exit 0
# hook の JSON の文字列フィールドを取り出す。jq がなければ(Windows で入っていないことが多い)簡易的に sed で取る
field() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r --arg k "$1" '.[$k] // empty' 2>/dev/null
  else
    printf '%s' "$input" | sed -n 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*"\(\([^"\\]\|\\.\)*\)".*/\1/p' | head -1 \
      | sed 's/\\"/"/g; s/\\\\/\\/g'
  fi
}
session_id=$(field session_id)
[ -z "$session_id" ] && exit 0

marker_dir="${TMPDIR:-/tmp}/claude-tab-opened"
mkdir -p "$marker_dir"

if [ "$1" = "mark" ]; then
  touch "$marker_dir/$session_id"
  exit 0
fi

# iTerm2・Windows Terminal のタブで直接動いているセッションは対象外
[ -n "$ITERM_SESSION_ID" ] && exit 0
[ -n "$WT_SESSION" ] && exit 0

# 最初のプロンプトのときだけ(まだ Claude の応答がない)
transcript=$(field transcript_path)
if [ -f "$transcript" ] && grep -q '"type":"assistant"' "$transcript"; then
  exit 0
fi

# 同じセッションで2回開かない(mkdir が成功した1回だけ進む)
mkdir "$marker_dir/$session_id.lock" 2>/dev/null || exit 0
[ -e "$marker_dir/$session_id" ] && exit 0
touch "$marker_dir/$session_id"

cwd=$(field cwd)
"$(dirname "$0")/open-session-tab.sh" "$session_id" "$cwd" >/dev/null 2>&1
exit 0
