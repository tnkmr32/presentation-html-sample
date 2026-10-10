# Windows Terminal で、タブ名に指定の文字列を含むタブを選んで前面に出す。
# 通知(notify.sh のトースト)をクリックしたときに、claude-focus: プロトコル経由で呼ばれる。
# 使い方: focus-windows-terminal.ps1 claude-focus:<タブ名の UTF-8 を base64url にしたもの>
#         focus-windows-terminal.ps1 -Name <タブ名>
# 見つからなければ Windows Terminal のウィンドウを前面に出すだけ。
param([string]$Uri = '', [string]$Name = '')

if (-not $Name -and $Uri -match '^claude-focus:/*([A-Za-z0-9_-]*)') {
  $b64 = $Matches[1].Replace('-', '+').Replace('_', '/')
  $b64 += '=' * ((4 - $b64.Length % 4) % 4)
  try { $Name = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64)) } catch { $Name = '' }
}

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -Namespace Win32 -Name User32 -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
'@

$AE = [Windows.Automation.AutomationElement]
$windows = $AE::RootElement.FindAll([Windows.Automation.TreeScope]::Children,
  (New-Object Windows.Automation.PropertyCondition($AE::ClassNameProperty, 'CASCADIA_HOSTING_WINDOW_CLASS')))
$tabCondition = New-Object Windows.Automation.PropertyCondition($AE::ControlTypeProperty, [Windows.Automation.ControlType]::TabItem)

function Show-Window($w) {
  $hwnd = [IntPtr]$w.Current.NativeWindowHandle
  if ([Win32.User32]::IsIconic($hwnd)) { [void][Win32.User32]::ShowWindow($hwnd, 9) }  # SW_RESTORE
  [void][Win32.User32]::SetForegroundWindow($hwnd)
}

if ($Name) {
  foreach ($w in $windows) {
    foreach ($tab in $w.FindAll([Windows.Automation.TreeScope]::Descendants, $tabCondition)) {
      if ($tab.Current.Name.Contains($Name)) {
        $tab.GetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern).Select()
        Show-Window $w
        exit 0
      }
    }
  }
}
if ($windows.Count -gt 0) { Show-Window $windows[0] }
