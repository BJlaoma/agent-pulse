const { spawn } = require("child_process");
const logger = require("./logger.js");

const COLORS = {
  green: "34C759",
  yellow: "FF9F0A",
  red: "FF3B30",
  gray: "8E8E93",
};

const POSITIONS = {
  "bottom-right": "br",
  "bottom-left": "bl",
  "top-right": "tr",
  "top-left": "tl",
};

function showCustomNotification(title, message, body, iconColor, config) {
  const position = config.notification.position || "bottom-right";
  const duration = config.notification.duration || 5000;
  const pos = POSITIONS[position] || "br";
  
  // Escape single quotes for PowerShell
  const safeMessage = message.replace(/'/g, "''");
  const safeBody = (body || "").replace(/'/g, "''");
  
  logger.info("Launching custom notification", { title, position: pos, duration });
  
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type @"
using System;
using System.Windows.Forms;
public class NF : Form {
    const int WS_EX_NOACTIVATE = 0x08000000;
    const int WS_EX_TOPMOST = 0x00000008;
    protected override CreateParams CreateParams {
        get {
            var cp = base.CreateParams;
            cp.ExStyle |= WS_EX_NOACTIVATE | WS_EX_TOPMOST;
            return cp;
        }
    }
}
"@ -ReferencedAssemblies "System.Windows.Forms"

$bodyText = '${safeBody}'
$statusText = '${safeMessage}'
$font = New-Object System.Drawing.Font('Cascadia Code', 10)
$keyFont = New-Object System.Drawing.Font('Cascadia Code', 10, [System.Drawing.FontStyle]::Bold)
$valFont = New-Object System.Drawing.Font('Cascadia Code', 10)
$keyColor = [System.Drawing.Color]::FromArgb(130, 170, 215)
$valColor = [System.Drawing.Color]::FromArgb(200, 200, 200)

# Parse body into key-value pairs
$pairs = @()
if ($bodyText.Length -gt 0) {
  $bodyParts = $bodyText -split "\`n"
  foreach ($part in $bodyParts) {
    $colonIdx = $part.IndexOf(":")
    if ($colonIdx -gt 0) {
      $lbl = $part.Substring(0, $colonIdx).Trim()
      $val = $part.Substring($colonIdx + 1).Trim()
      $pairs += @{ key = $lbl; val = $val }
    }
  }
}

$pad = 20
$dotX = 14
$lineH = 20
$gap = 4
$formW = 420

# Calculate total height
$totalH = $pad  # top pad
# Status line
$totalH += $lineH
if ($pairs.Count -gt 0) {
  $totalH += $gap * 2  # gap before pairs
  foreach ($p in $pairs) {
    $totalH += $lineH + $gap
  }
}
$totalH += $pad  # bottom pad
$formH = [Math]::Max(70, $totalH)

$form = New-Object NF
$form.FormBorderStyle = 'None'
$form.StartPosition = 'Manual'
$form.ShowInTaskbar = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(26, 26, 46)
$form.Opacity = 0.95
$form.Width = $formW
$form.Height = $formH

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
switch ('${pos}') {
  'br' { $form.Left = $screen.Width - $form.Width - 20; $form.Top = $screen.Height - $formH - 40 }
  'bl' { $form.Left = 20; $form.Top = $screen.Height - $formH - 40 }
  'tr' { $form.Left = $screen.Width - $form.Width - 20; $form.Top = 20 }
  'tl' { $form.Left = 20; $form.Top = 20 }
}

$y = $pad

# Colored dot
$dotLabel = New-Object System.Windows.Forms.Label
$dotLabel.Left = $dotX; $dotLabel.Top = $y
$dotLabel.Text = '●'
$dotLabel.Font = $font
$dotLabel.AutoSize = $true
$dotLabel.BackColor = $form.BackColor
$dotColor = [System.Drawing.Color]::FromArgb(52, 199, 89)
if ('${iconColor}' -eq 'yellow') { $dotColor = [System.Drawing.Color]::FromArgb(255, 159, 10) }
elseif ('${iconColor}' -eq 'red') { $dotColor = [System.Drawing.Color]::FromArgb(255, 59, 48) }
elseif ('${iconColor}' -eq 'gray') { $dotColor = [System.Drawing.Color]::FromArgb(142, 142, 147) }
$dotLabel.ForeColor = $dotColor
$form.Controls.Add($dotLabel)

# Status label
$stLabel = New-Object System.Windows.Forms.Label
$stLabel.Left = $dotX + 18; $stLabel.Top = $y
$stLabel.Text = $statusText
$stLabel.Font = $font
$stLabel.ForeColor = [System.Drawing.Color]::White
$stLabel.AutoSize = $true
$stLabel.BackColor = $form.BackColor
$form.Controls.Add($stLabel)
$y += $lineH + $gap * 2

# Key-value rows
foreach ($p in $pairs) {
  $keyLabel = New-Object System.Windows.Forms.Label
  $keyLabel.Left = $dotX + 24; $keyLabel.Top = $y
  $keyLabel.Text = $p.key
  $keyLabel.Font = $keyFont
  $keyLabel.ForeColor = $keyColor
  $keyLabel.AutoSize = $true
  $keyLabel.BackColor = $form.BackColor
  $form.Controls.Add($keyLabel)
  
  $valLabel = New-Object System.Windows.Forms.Label
  $valLabel.Left = $dotX + 90; $valLabel.Top = $y
  $valLabel.Text = $p.val
  $valLabel.Font = $valFont
  $valLabel.ForeColor = $valColor
  $valLabel.AutoSize = $true
  $valLabel.BackColor = $form.BackColor
  $form.Controls.Add($valLabel)
  
  $y += $lineH + $gap
}

# Single-click focus handler
$focusAction = {
  $form.Close()
  $h = (Get-Process WindowsTerminal -ErrorAction 0 | Where MainWindowHandle | Select -First 1).MainWindowHandle
  if ($h) {
    try { [WF]::Focus($h) } catch {
      Add-Type -ReferencedAssemblies System -TypeDefinition ('using System;using System.Runtime.InteropServices;' +
        'public class WF{[DllImport("user32")]static extern bool ShowWindow(IntPtr h,int c);' +
        '[DllImport("user32")]static extern bool SetForegroundWindow(IntPtr h);' +
        '[DllImport("user32")]static extern bool IsIconic(IntPtr h);' +
        'public static bool Focus(IntPtr h){if(IsIconic(h))ShowWindow(h,9);return SetForegroundWindow(h);}}')
      try { [WF]::Focus($h) } catch {}
    }
  }
}
$form.Add_Click($focusAction)
$form.Add_MouseClick($focusAction)

# X close button
$xBtn = New-Object System.Windows.Forms.Label
$xBtn.Left = $formW - 30; $xBtn.Top = $pad - 4
$xBtn.Text = 'x'
$xBtn.Font = New-Object System.Drawing.Font('Cascadia Code', 12)
$xBtn.ForeColor = [System.Drawing.Color]::FromArgb(130, 130, 150)
$xBtn.AutoSize = $true
$xBtn.BackColor = $form.BackColor
$xBtn.Add_Click({ $form.Close() })
$form.Controls.Add($xBtn)
$xBtn.BringToFront()

# Slide-up animation with fade
$targetTop = $form.Top
$form.Top += $form.Height + 30
$form.Opacity = 0
$form.Show()
$steps = [Math]::Ceiling(($form.Height + 30) / 10)
for ($i = $steps; $i -ge 0; $i--) {
  $form.Top = $targetTop + ($i * 10)
  $form.Opacity = [Math]::Min(0.95, (1 - $i / $steps) * 0.95)
  [System.Windows.Forms.Application]::DoEvents()
  Start-Sleep -Milliseconds 8
}
$form.Top = $targetTop
$form.Opacity = 0.95

$end = [DateTime]::Now.AddMilliseconds(${duration})
while ([DateTime]::Now -lt $end -and $form.Visible) {
  [System.Windows.Forms.Application]::DoEvents()
  Start-Sleep -Milliseconds 50
}

# Slide-down with fade
for ($i = 0; $i -le $steps; $i++) {
  $form.Top = $targetTop + ($i * 10)
  $form.Opacity = [Math]::Max(0, (1 - $i / $steps) * 0.95)
  [System.Windows.Forms.Application]::DoEvents()
  Start-Sleep -Milliseconds 8
}
$form.Close()
`;

  const ps = spawn("powershell", [
    "-Sta",
    "-WindowStyle", "Hidden",
    "-ExecutionPolicy", "Bypass",
    "-Command", psScript,
  ], {
    windowsHide: true,
  });
  
  ps.on("exit", (code) => {
    logger.debug("Custom notification process exited", { code });
  });
  
  ps.on("error", (err) => {
    logger.error("Custom notification process error", { error: err.message });
  });
  
  setTimeout(() => {
    try { ps.kill(); } catch (e) {}
  }, duration + 1000);
}

module.exports = { showCustomNotification };
