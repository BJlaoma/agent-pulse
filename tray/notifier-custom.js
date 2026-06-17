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
  const hexColor = COLORS[iconColor] || COLORS.gray;
  const pos = POSITIONS[position] || "br";
  
  // Escape single quotes for PowerShell string literals
  const safeTitle = title.replace(/'/g, "''");
  const safeMessage = message.replace(/'/g, "''");
  const safeBody = (body || "").replace(/'/g, "''");
  
  logger.info("Launching custom notification", { title, position: pos, duration });
  
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = 'None'
$form.StartPosition = 'Manual'
$form.ShowInTaskbar = $false
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(45, 45, 45)
$form.Opacity = 0.95

$bodyText = '${safeBody}'
$contentWidth = 330

# Measure content heights
$g = [System.Drawing.Graphics]::FromHwnd([IntPtr]::Zero)

$titleFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$titleText = '${safeTitle}'

$statusText = '${safeMessage}'
$statusSize = $g.MeasureString($statusText, $titleFont, $contentWidth)

$bodyFont = New-Object System.Drawing.Font('Segoe UI', 9)
$bodySize = $g.MeasureString($bodyText, $bodyFont, $contentWidth)
$bodyFullHeight = if ($bodyText.Length -gt 0) { [Math]::Ceiling($bodySize.Height) } else { 0 }

$g.Dispose()

$padX = 16
$padTop = 14
$gap = 6
$barMargin = 10
$curY = $padTop

# Status (first line, colored)
$curY += [Math]::Ceiling($statusSize.Height)
# Gap to body
$curY += $barMargin
# Body
$curY += $bodyFullHeight
# Bottom padding
$curY += $padTop

$formHeight = [Math]::Max(70, $curY)
if ($formHeight -gt 320) { $formHeight = 320 }

$form.Width = 360
$form.Height = $formHeight

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
switch ('${pos}') {
  'br' { $form.Left = $screen.Width - $form.Width - 20; $form.Top = $screen.Height - $formHeight - 40 }
  'bl' { $form.Left = 20; $form.Top = $screen.Height - $formHeight - 40 }
  'tr' { $form.Left = $screen.Width - $form.Width - 20; $form.Top = 20 }
  'tl' { $form.Left = 20; $form.Top = 20 }
}

# Left color bar
$bar = New-Object System.Windows.Forms.Panel
$bar.Left = 0; $bar.Top = 0
$bar.Width = 4; $bar.Height = $formHeight
$bar.BackColor = [System.Drawing.Color]::FromArgb(255, [Convert]::ToInt32('${hexColor}'.Substring(0,2), 16), [Convert]::ToInt32('${hexColor}'.Substring(2,2), 16), [Convert]::ToInt32('${hexColor}'.Substring(4,2), 16))
$form.Controls.Add($bar)

$y = $padTop

# Status label (colored, replaces old title)
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Left = $padX; $statusLabel.Top = $y
$statusLabel.Width = $contentWidth
$statusLabel.Text = $statusText
$statusLabel.AutoSize = $true
$statusLabel.Font = $titleFont
$statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(52, 199, 89)
if ('${iconColor}' -eq 'yellow') { $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 159, 10) }
elseif ('${iconColor}' -eq 'red') { $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 59, 48) }
elseif ('${iconColor}' -eq 'gray') { $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(142, 142, 147) }
$form.Controls.Add($statusLabel)
$y += $statusSize.Height + $barMargin

# Body label
$bodyLabel = New-Object System.Windows.Forms.Label
$bodyLabel.Left = $padX; $bodyLabel.Top = $y
$bodyLabel.Width = $contentWidth; $bodyLabel.Height = $bodyFullHeight
$bodyLabel.Text = $bodyText
$bodyLabel.ForeColor = [System.Drawing.Color]::FromArgb(185, 185, 185)
$bodyLabel.Font = $bodyFont
$form.Controls.Add($bodyLabel)

# Click to close
$form.Add_Click({ $form.Close() })

# Run message loop
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
  
  // Kill notification after duration
  setTimeout(() => {
    try {
      ps.kill();
    } catch (e) {}
  }, duration + 1000);
}

module.exports = { showCustomNotification };
