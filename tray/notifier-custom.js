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

$bodyText = '${safeBody}'
$statusText = '${safeMessage}'
$font = New-Object System.Drawing.Font('Consolas', 10)

# Build content text
$lines = @()
$lines += "  " + $statusText
if ($bodyText.Length -gt 0) {
  $lines += ""
  $bodyParts = $bodyText -split "\`n"
  foreach ($part in $bodyParts) {
    $colonIdx = $part.IndexOf(":")
    if ($colonIdx -gt 0) {
      $lbl = $part.Substring(0, $colonIdx).Trim()
      $val = $part.Substring($colonIdx + 1).Trim()
      $lines += ("  " + $lbl + " ".PadRight([Math]::Max(1, 5 - $lbl.Length)) + $val)
    }
  }
}
$content = $lines -join "\`n"

# Measure required size
$g = [System.Drawing.Graphics]::FromHwnd([IntPtr]::Zero)
$maxW = 400
$size = $g.MeasureString($content, $font, $maxW)
$g.Dispose()

$pad = 20
$dotX = 14
$formW = [Math]::Ceiling($size.Width) + $pad * 2
$formH = [Math]::Ceiling($size.Height) + $pad * 2
if ($formW -lt 260) { $formW = 260 }
if ($formH -lt 70) { $formH = 70 }

$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = 'None'
$form.StartPosition = 'Manual'
$form.ShowInTaskbar = $false
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(26, 26, 46)
$form.Opacity = 0.95
$form.Width = $formW
$form.Height = $formH

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
switch ('${pos}') {
  'br' { $form.Left = $screen.Width - $form.Width - 20; $form.Top = $screen.Height - $form.Height - 40 }
  'bl' { $form.Left = 20; $form.Top = $screen.Height - $form.Height - 40 }
  'tr' { $form.Left = $screen.Width - $form.Width - 20; $form.Top = 20 }
  'tl' { $form.Left = 20; $form.Top = 20 }
}

# Main text label
$label = New-Object System.Windows.Forms.Label
$label.Left = $dotX + 16; $label.Top = $pad
$label.Width = $formW - $dotX - 24
$label.Height = $formH - $pad * 2
$label.Text = $content
$label.ForeColor = [System.Drawing.Color]::FromArgb(224, 224, 224)
$label.Font = $font
$label.BackColor = [System.Drawing.Color]::FromArgb(26, 26, 46)
$form.Controls.Add($label)

# Colored dot (overlay)
$dotLabel = New-Object System.Windows.Forms.Label
$dotLabel.Left = $dotX; $dotLabel.Top = $pad
$dotLabel.Text = '●'
$dotLabel.Font = $font
$dotLabel.AutoSize = $true
$dotLabel.BackColor = [System.Drawing.Color]::FromArgb(26, 26, 46)
$dotColor = [System.Drawing.Color]::FromArgb(52, 199, 89)
if ('${iconColor}' -eq 'yellow') { $dotColor = [System.Drawing.Color]::FromArgb(255, 159, 10) }
elseif ('${iconColor}' -eq 'red') { $dotColor = [System.Drawing.Color]::FromArgb(255, 59, 48) }
elseif ('${iconColor}' -eq 'gray') { $dotColor = [System.Drawing.Color]::FromArgb(142, 142, 147) }
$dotLabel.ForeColor = $dotColor
$form.Controls.Add($dotLabel)
$dotLabel.BringToFront()

$form.Add_Click({ $form.Close() })
[System.Windows.Forms.Application]::Run($form)
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
    try {
      ps.kill();
    } catch (e) {}
  }, duration + 1000);
}

module.exports = { showCustomNotification };
