#!/bin/bash
# Claude Code の Stop / Notification hook から呼ばれ、macOS の通知を出す。
# terminal-notifier があれば、通知をクリックしたときに iTerm2 の該当セッションへ移動する
# (該当するタブがなければ新しいタブで開く)。
# 使い方: notify.sh stop|notification  (stdin に hook の JSON)

event="$1"
input=$(cat)
field() { printf '%s' "$input" | jq -r "$1" 2>/dev/null; }

project=$(basename "$(field '.cwd // empty')" 2>/dev/null)
project=${project:-Claude Code}
session_id=$(field '.session_id // empty')
transcript=$(field '.transcript_path // empty')

# セッション名(/rename の名前、なければ自動タイトル)。iTerm2 のタブ名にも表示される
title=""
if [ -f "$transcript" ]; then
  title=$(jq -r 'select(.type == "custom-title" or .type == "agent-name" or .type == "ai-title")
    | .customTitle // .agentName // .aiTitle // empty' "$transcript" 2>/dev/null | tail -1)
fi

if [ "$event" = "notification" ]; then
  # 応答の完了後、しばらく入力がないと届く「入力待ち」の通知は出さない(完了は Stop で通知済み)
  notification_type=$(field '.notification_type // empty')
  message=$(field '.message // empty')
  if [ "$notification_type" = "idle_prompt" ] || [[ "$message" == *"waiting for your input"* ]]; then
    exit 0
  fi
  message=${message:-入力を待っています}
  sound=Ping
else
  message="応答が完了しました"
  sound=Glass
fi

if command -v terminal-notifier >/dev/null 2>&1; then
  args=(-title "Claude Code" -subtitle "${title:-$project}" -message "$message" -sound "$sound")
  [ -n "$session_id" ] && args+=(-group "claude-$session_id")
  # 移動先の iTerm2 セッションを ITERM_SESSION_ID("w0t1p0:<UUID>" 形式)で特定する。
  # バックグラウンドセッションには ITERM_SESSION_ID がないため、タブ名とセッション名の一致で探す
  focus="$(cd "$(dirname "$0")" && pwd)/focus-iterm.sh"
  if [ -n "$ITERM_SESSION_ID" ]; then
    args+=(-execute "'$focus' id '${ITERM_SESSION_ID#*:}'")
  elif [ -n "$title" ] || [ -n "$session_id" ]; then
    # タブが見つからなければ、新しいタブでこのセッションを開く(claude attach)
    args+=(-execute "'$focus' name '${title//\'/}' '$session_id'")
  else
    args+=(-activate com.googlecode.iterm2)
  fi
  terminal-notifier "${args[@]}" >/dev/null 2>&1
elif command -v osascript >/dev/null 2>&1; then
  message=${message//\"/\'}
  subtitle=${title:-$project}
  subtitle=${subtitle//\"/\'}
  osascript -e "display notification \"$message\" with title \"Claude Code\" subtitle \"$subtitle\" sound name \"$sound\"" >/dev/null 2>&1
fi
exit 0
