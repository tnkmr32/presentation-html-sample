# 通知をクリックしたときに、Windows Terminal の該当タブ、または VSCode のウィンドウを前面に出す。
# notify.sh のトーストから claude-focus: プロトコル経由で呼ばれる。
# 使い方: focus-window.ps1 claude-focus:<タブ名の UTF-8 を base64url にしたもの>
#         focus-window.ps1 claude-focus:code/<フォルダ名の UTF-8 を base64url にしたもの>
#         focus-window.ps1 -Name <タブ名>
# 見つからなければ Windows Terminal のウィンドウを前面に出すだけ。
# code/ の形式では、タイトルにフォルダ名を含む VSCode のウィンドウ(なければ最初の VSCode のウィンドウ)を前面に出す。
param([string]$Uri = '', [string]$Name = '')

$vscode = $false
if (-not $Name -and $Uri -match '^claude-focus:/*(code/)?([A-Za-z0-9_-]*)') {
  $vscode = [bool]$Matches[1]
  $b64 = $Matches[2].Replace('-', '+').Replace('_', '/')
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

function Show-Window($w) {
  $hwnd = [IntPtr]$w.Current.NativeWindowHandle
  if ([Win32.User32]::IsIconic($hwnd)) { [void][Win32.User32]::ShowWindow($hwnd, 9) }  # SW_RESTORE
  [void][Win32.User32]::SetForegroundWindow($hwnd)
}

if ($vscode) {
  $codeWindows = @($AE::RootElement.FindAll([Windows.Automation.TreeScope]::Children,
      (New-Object Windows.Automation.PropertyCondition($AE::ClassNameProperty, 'Chrome_WidgetWin_1'))) |
    Where-Object { $_.Current.Name.EndsWith('Visual Studio Code') })
  $target = $codeWindows | Where-Object { $Name -and $_.Current.Name.Contains($Name) } | Select-Object -First 1
  if (-not $target) { $target = $codeWindows | Select-Object -First 1 }
  if ($target) { Show-Window $target }
  exit 0
}

$windows =$AE::RootElement.FindAll([Windows.Automation.TreeScope]::Children,
  (New-Object Windows.Automation.PropertyCondition($AE::ClassNameProperty, 'CASCADIA_HOSTING_WINDOW_CLASS')))
$tabCondition = New-Object Windows.Automation.PropertyCondition($AE::ControlTypeProperty, [Windows.Automation.ControlType]::TabItem)

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
