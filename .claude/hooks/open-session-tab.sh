#!/bin/bash
# Claude Code のセッションをターミナルの新しいタブで開く(claude attach)。
# macOS では iTerm2(open-iterm-tab.sh)、Windows(WSL・Git Bash)では
# Windows Terminal(open-windows-terminal-tab.sh)を使う。
# 使い方: open-session-tab.sh <セッションID> [作業ディレクトリ]

dir="$(cd "$(dirname "$0")" && pwd)"
if command -v osascript >/dev/null 2>&1; then
  exec "$dir/open-iterm-tab.sh" "$@"
elif command -v wt.exe >/dev/null 2>&1; then
  exec "$dir/open-windows-terminal-tab.sh" "$@"
fi
echo "新しいタブを開けるターミナルが見つかりません(iTerm2・Windows Terminal に対応)" >&2
exit 1
