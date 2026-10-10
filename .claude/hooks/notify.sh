#!/bin/bash
# Claude Code の Stop / Notification hook から呼ばれ、デスクトップ通知を出す。
# - macOS: terminal-notifier があれば、通知をクリックしたときに iTerm2 の該当セッションへ移動する
#   (該当するタブがなければ新しいタブで開く)。なければ osascript で通知だけ出す。
# - Windows(ネイティブ版の Git Bash、WSL): powershell.exe でトースト通知を出す。
# 使い方: notify.sh stop|notification  (stdin に hook の JSON)

event="$1"
input=$(cat)
# hook の JSON の文字列フィールドを取り出す。jq がなければ(Windows で入っていないことが多い)簡易的に sed で取る
field() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r --arg k "$1" '.[$k] // empty' 2>/dev/null
  else
    printf '%s' "$input" | sed -n 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*"\(\([^"\\]\|\\.\)*\)".*/\1/p' | head -1 \
      | sed 's/\\"/"/g; s/\\\\/\\/g'
  fi
}

# Windows のパス(C:\Users\...)でも最後の要素を取る
cwd=$(field cwd)
project=${cwd%[/\\]}
project=${project##*[/\\]}
project=${project:-Claude Code}
session_id=$(field session_id)
transcript=$(field transcript_path)

# セッション名(/rename の名前、なければ自動タイトル)。iTerm2・Windows Terminal のタブ名にも表示される
title=""
if [ -f "$transcript" ]; then
  if command -v jq >/dev/null 2>&1; then
    title=$(jq -r 'select(.type == "custom-title" or .type == "agent-name" or .type == "ai-title")
      | .customTitle // .agentName // .aiTitle // empty' "$transcript" 2>/dev/null | tail -1)
  else
    title=$(grep -oE '"(customTitle|agentName|aiTitle)":"([^"\\]|\\.)*"' "$transcript" 2>/dev/null | tail -1 \
      | sed 's/^"[^"]*":"//; s/"$//; s/\\"/"/g; s/\\\\/\\/g')
  fi
fi

if [ "$event" = "notification" ]; then
  # 応答の完了後、しばらく入力がないと届く「入力待ち」の通知は出さない(完了は Stop で通知済み)
  notification_type=$(field notification_type)
  message=$(field message)
  if [ "$notification_type" = "idle_prompt" ] || [[ "$message" == *"waiting for your input"* ]]; then
    exit 0
  fi
  message=${message:-入力を待っています}
  sound=Ping
  win_sound=Reminder
else
  message="応答が完了しました"
  sound=Glass
  win_sound=Default
fi

# Windows のトースト通知。文字列は base64 で渡し、PowerShell 側で XML エスケープする
# (WSL から Windows のプロセスへ引数を渡すときの引用符・文字コードの崩れを避ける)。
# claude-focus: プロトコルが登録済み(.claude/bin/setup-windows-notify)なら、通知をクリックしたときに
# Windows Terminal でタブ名にセッション名を含むタブへ移動する(focus-windows-terminal.ps1)
windows_toast() {
  b64() { printf '%s' "$1" | base64 | tr -d '\r\n'; }
  local launch script
  launch="claude-focus:$(b64 "$title" | tr '+/' '-_' | tr -d '=')"
  script="\$ErrorActionPreference = 'Stop'
function D(\$s) { [Security.SecurityElement]::Escape([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(\$s))) }
[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
[void][Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]
\$activation = ''
if (Test-Path 'HKCU:\\Software\\Classes\\claude-focus\\shell\\open\\command') { \$activation = \" activationType='protocol' launch='$launch'\" }
\$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
\$xml.LoadXml(\"<toast\$activation><visual><binding template='ToastGeneric'><text>\$(D '$(b64 "Claude Code")')</text><text>\$(D '$(b64 "$1")')</text><text>\$(D '$(b64 "$2")')</text></binding></visual><audio src='ms-winsoundevent:Notification.$win_sound'/></toast>\")
\$toast = [Windows.UI.Notifications.ToastNotification]::new(\$xml)
\$toast.Tag = '${session_id:0:36}'
\$toast.Group = 'claude'
\$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(\$app).Show(\$toast)"
  # PowerShell の起動は 1 秒ほどかかるため、hook を待たせないようバックグラウンドで実行する
  powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand \
    "$(printf '%s' "$script" | iconv -f UTF-8 -t UTF-16LE | base64 | tr -d '\r\n')" \
    </dev/null >/dev/null 2>&1 &
}

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
elif command -v powershell.exe >/dev/null 2>&1; then
  windows_toast "${title:-$project}" "$message"
fi
exit 0
