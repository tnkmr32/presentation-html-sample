#!/bin/bash
# iTerm2 で、指定したセッションのウィンドウ・タブ・ペインを前面に出す。
# 使い方: focus-iterm.sh id <ITERM_SESSION_ID の UUID 部分>
#         focus-iterm.sh name <タブ名に含まれる文字列> [Claude Code のセッションID]
# 見つからないとき、Claude Code のセッションIDがあれば新しいタブでそのセッションを開き、
# なければ iTerm2 を前面に出すだけ。

# open-iterm-tab.sh で開いたタブは、タブ名にジョブID(セッションIDの先頭8文字)を含む
job_id=${3:0:8}

found=$(osascript - "$1" "$2" "$job_id" <<'APPLESCRIPT'
on run argv
  set mode to item 1 of argv
  set target to item 2 of argv
  set jobId to item 3 of argv
  tell application "iTerm2"
    repeat with w in windows
      repeat with t in tabs of w
        repeat with s in sessions of t
          if mode is "id" then
            set matched to (unique id of s is target)
          else
            set matched to ((target is not "" and name of s contains target) or (jobId is not "" and name of s contains jobId))
          end if
          if matched then
            activate
            select w
            select t
            select s
            return "yes"
          end if
        end repeat
      end repeat
    end repeat
  end tell
  return "no"
end run
APPLESCRIPT
)

if [ "$found" != "yes" ]; then
  if [ -n "$3" ]; then
    "$(dirname "$0")/open-iterm-tab.sh" "$3"
  else
    osascript -e 'tell application "iTerm2" to activate'
  fi
fi
