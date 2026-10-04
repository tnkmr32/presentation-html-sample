#!/bin/bash
# Windows Terminal の新しいタブで Claude Code のセッションを開く(claude attach)。
# WSL・Git Bash(ネイティブ版)から使う。open-iterm-tab.sh の Windows 版。
# 使い方: open-windows-terminal-tab.sh <セッションID> [作業ディレクトリ]
# タブはセッションの作業ディレクトリで開く。作業ディレクトリは claude agents --json の値を使い、
# 取れなければ引数の値を使う。claude attach を抜けたあとはそのタブでシェルが使える。

id="$1"
if ! [[ "$id" =~ ^[0-9a-fA-F-]+$ ]]; then
  echo "セッションIDが不正です: $id" >&2
  exit 1
fi
if ! command -v wt.exe >/dev/null 2>&1; then
  echo "wt.exe(Windows Terminal)が見つかりません" >&2
  exit 1
fi

# claude attach が受け付けるのはジョブID(例: a8a8fe5c)。claude agents --json でセッションIDから引く。
# jq がなければ(Windows・WSL で入っていないことが多い)ジョブIDと同じ値のセッションIDの先頭8文字を使う。
# タブ名は「<ジョブID> <セッション名>」にする(open-iterm-tab.sh と同じ)
job_id=""; name=""; cwd=""
if command -v jq >/dev/null 2>&1; then
  for _ in 1 2 3 4 5; do
    # 区切りは \x1f(空のフィールドがあっても詰まらないように、空白でない文字を使う)
    IFS=$'\x1f' read -r job_id name cwd < <(claude agents --json 2>/dev/null \
      | jq -r --arg id "$id" '.[] | select(.sessionId == $id or .id == $id)
          | [.id, (.name // ""), (.cwd // "")] | join("\u001f")' | head -1)
    [ -n "$job_id" ] && break
    sleep 1
  done
fi
job_id=${job_id:-${id:0:8}}
cwd=${cwd:-$2}
title="$job_id${name:+ $name}"

# wt.exe は「;」をコマンドの区切りとして扱うため、コマンド中の「;」は「\;」と書く
if [ -n "$WSL_DISTRO_NAME" ]; then
  shell=${SHELL:-/bin/bash}
  args=(wsl.exe -d "$WSL_DISTRO_NAME")
  if [ -n "$cwd" ] && [ -d "$cwd" ]; then
    args+=(--cd "$cwd")
  fi
  # claude を PATH に追加する設定が .bashrc などにあることが多いので、対話・ログインシェルで実行する
  args+=(-- "$shell" -lic "claude attach $job_id\\; exec $shell -l")
else
  # Git Bash。Git for Windows の bin/bash.exe(ログインシェルとして PATH などを設定する)を使う
  root=$(cygpath -w / 2>/dev/null)
  bash_exe="${root%\\}\\bin\\bash.exe"
  [ -f "$(cygpath -u "$bash_exe" 2>/dev/null)" ] || bash_exe=$(cygpath -w "$BASH" 2>/dev/null)
  args=()
  if [ -n "$cwd" ] && [ -d "$cwd" ]; then
    args+=(-d "$(cygpath -w "$cwd")")
  fi
  args+=("$bash_exe" -lic "claude attach $job_id\\; exec bash -l")
fi

# -w 0: 最後に使った Windows Terminal のウィンドウに新しいタブを追加する(ウィンドウがなければ新しく開く)
exec wt.exe -w 0 new-tab --title "$title" "${args[@]}"
