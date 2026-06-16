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

function showCustomNotification(title, message, iconColor, config) {
  const position = config.notification.position || "bottom-right";
  const duration = config.notification.duration || 5000;
  const hexColor = COLORS[iconColor] || COLORS.gray;
  const pos = POSITIONS[position] || "br";
  
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
$form.Width = 320
$form.Height = 90
$form.Opacity = 0.95

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea

switch ('${pos}') {
  'br' { $form.Left = $screen.Width - 340; $form.Top = $screen.Height - 110 }
  'bl' { $form.Left = 20; $form.Top = $screen.Height - 110 }
  'tr' { $form.Left = $screen.Width - 340; $form.Top = 20 }
  'tl' { $form.Left = 20; $form.Top = 20 }
}

# Border panel
$panel = New-Object System.Windows.Forms.Panel
$panel.Dock = 'Fill'
$panel.BackColor = [System.Drawing.Color]::FromArgb(45, 45, 45)
$panel.Padding = '15,12,15,12'

# Left color bar
$bar = New-Object System.Windows.Forms.Panel
$bar.Width = 4
$bar.Dock = 'Left'
$bar.BackColor = [System.Drawing.Color]::FromArgb(255, [Convert]::ToInt32('${hexColor}'.Substring(0,2), 16), [Convert]::ToInt32('${hexColor}'.Substring(2,2), 16), [Convert]::ToInt32('${hexColor}'.Substring(4,2), 16))
$panel.Controls.Add($bar)

# Title
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = '${title}'
$titleLabel.ForeColor = [System.Drawing.Color]::White
$titleLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$titleLabel.Dock = 'Top'
$titleLabel.Height = 22
$panel.Controls.Add($titleLabel)

# Message
$msgLabel = New-Object System.Windows.Forms.Label
$msgLabel.Text = '${message}'
$msgLabel.ForeColor = [System.Drawing.Color]::FromArgb(200, 200, 200)
$msgLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$msgLabel.Dock = 'Fill'
$panel.Controls.Add($msgLabel)

$form.Controls.Add($panel)

# Click to close
$form.Add_Click({ $form.Close() })

$form.Show()

Start-Sleep -Milliseconds ${duration}
$form.Close()
`;

  const ps = spawn("powershell", [
    "-Sta",
    "-WindowStyle", "Hidden",
    "-ExecutionPolicy", "Bypass",
    "-Command", psScript,
  ], {
    windowsHide: true,
    detached: true,
  });
  
  ps.on("exit", (code) => {
    logger.debug("Custom notification process exited", { code });
  });
  
  ps.on("error", (err) => {
    logger.error("Custom notification process error", { error: err.message });
  });
}

module.exports = { showCustomNotification };
