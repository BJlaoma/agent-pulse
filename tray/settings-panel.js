const { spawn } = require("child_process");
const { join } = require("path");
const logger = require("./logger.js");

function showSettingsPanel() {
  const config = require("./config.js").loadConfig();
  const n = config.notification;

  // Serialize specific values for PowerShell
  const enabled = n.enabled ? "$true" : "$false";
  const sound = n.sound ? "$true" : "$false";
  const notifyOnStr = n.notifyOn.map(s => `'${s}'`).join(",");

  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$configPath = "${join(require("os").homedir(), ".config", "opencode", "agent-pulse.json").replace(/\\/g, "\\\\")}"

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Agent Pulse 设置'
$form.Width = 360; $form.Height = 460
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.TopMost = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

$y = 16; $lx = 16; $lx2 = 140

# --- Notification enabled ---
$cbEnabled = New-Object System.Windows.Forms.CheckBox
$cbEnabled.Left = $lx; $cbEnabled.Top = $y; $cbEnabled.Width = 320
$cbEnabled.Text = '启用通知'
$cbEnabled.Checked = ${enabled}
$form.Controls.Add($cbEnabled)
$y += 28

# --- Sound ---
$cbSound = New-Object System.Windows.Forms.CheckBox
$cbSound.Left = $lx; $cbSound.Top = $y; $cbSound.Width = 320
$cbSound.Text = '启用声音'
$cbSound.Checked = ${sound}
$form.Controls.Add($cbSound)
$y += 28

# --- Filter ---
$lblFilter = New-Object System.Windows.Forms.Label
$lblFilter.Left = $lx; $lblFilter.Top = $y; $lblFilter.Width = 80
$lblFilter.Text = '通知过滤:'
$form.Controls.Add($lblFilter)
$cmbFilter = New-Object System.Windows.Forms.ComboBox
$cmbFilter.Left = $lx2; $cmbFilter.Top = $y; $cmbFilter.Width = 170
$cmbFilter.Items.AddRange(@('all', 'attention', 'none'))
$cmbFilter.SelectedItem = '${n.filter}'
$form.Controls.Add($cmbFilter)
$y += 30

# --- Position ---
$lblPos = New-Object System.Windows.Forms.Label
$lblPos.Left = $lx; $lblPos.Top = $y; $lblPos.Width = 80
$lblPos.Text = '弹窗位置:'
$form.Controls.Add($lblPos)
$cmbPos = New-Object System.Windows.Forms.ComboBox
$cmbPos.Left = $lx2; $cmbPos.Top = $y; $cmbPos.Width = 170
$cmbPos.Items.AddRange(@('bottom-right', 'bottom-left', 'top-right', 'top-left'))
$cmbPos.SelectedItem = '${n.position}'
$form.Controls.Add($cmbPos)
$y += 30

# --- Duration ---
$lblDur = New-Object System.Windows.Forms.Label
$lblDur.Left = $lx; $lblDur.Top = $y; $lblDur.Width = 80
$lblDur.Text = '显示时长(ms):'
$form.Controls.Add($lblDur)
$numDur = New-Object System.Windows.Forms.NumericUpDown
$numDur.Left = $lx2; $numDur.Top = $y; $numDur.Width = 80
$numDur.Minimum = 1000; $numDur.Maximum = 30000; $numDur.Increment = 1000
$numDur.Value = ${n.duration}
$form.Controls.Add($numDur)
$y += 32

# --- Style ---
$lblStyle = New-Object System.Windows.Forms.Label
$lblStyle.Left = $lx; $lblStyle.Top = $y; $lblStyle.Width = 80
$lblStyle.Text = '通知样式:'
$form.Controls.Add($lblStyle)
$cmbStyle = New-Object System.Windows.Forms.ComboBox
$cmbStyle.Left = $lx2; $cmbStyle.Top = $y; $cmbStyle.Width = 170
$cmbStyle.Items.AddRange(@('custom', 'native'))
$cmbStyle.SelectedItem = '${n.style}'
$form.Controls.Add($cmbStyle)
$y += 30

# --- notifyOn statuses ---
$lblOn = New-Object System.Windows.Forms.Label
$lblOn.Left = $lx; $lblOn.Top = $y; $lblOn.Width = 120
$lblOn.Text = '触发通知的状态:'
$form.Controls.Add($lblOn)
$y += 22

$statuses = @('thinking', 'idle', 'waiting', 'error', 'disconnected')
$notifyOn = @(${notifyOnStr})
$checkboxes = @()
foreach ($s in $statuses) {
  $cb = New-Object System.Windows.Forms.CheckBox
  $cb.Left = $lx + 20; $cb.Top = $y; $cb.Width = 140
  $cb.Text = $s
  $cb.Checked = $notifyOn -contains $s
  $form.Controls.Add($cb)
  $checkboxes += $cb
  $y += 22
}

# --- Save button ---
$btnSave = New-Object System.Windows.Forms.Button
$btnSave.Left = $lx; $btnSave.Top = $y + 8; $btnSave.Width = 100; $btnSave.Height = 28
$btnSave.Text = '保存'
$btnSave.Add_Click({
  $selected = @()
  foreach ($cb in $checkboxes) { if ($cb.Checked) { $selected += $cb.Text } }
  $cfg = @{
    notification = @{
      enabled = $cbEnabled.Checked
      sound = $cbSound.Checked
      filter = $cmbFilter.SelectedItem.ToString()
      notifyOn = $selected
      style = $cmbStyle.SelectedItem.ToString()
      position = $cmbPos.SelectedItem.ToString()
      duration = [int]$numDur.Value
      width = 320
      height = 100
    }
    tray = @{ showLabel = $true }
  } | ConvertTo-Json -Depth 4
  Set-Content -Path $configPath -Value $cfg
  [System.Windows.Forms.MessageBox]::Show('设置已保存，托盘重启后生效', 'Agent Pulse', 'OK', 'Information')
  $form.Close()
})
$form.Controls.Add($btnSave)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Left = 130; $btnCancel.Top = $y + 8; $btnCancel.Width = 100; $btnCancel.Height = 28
$btnCancel.Text = '取消'
$btnCancel.Add_Click({ $form.Close() })
$form.Controls.Add($btnCancel)

$form.Add_Shown({ $form.Activate(); $form.BringToFront() })
[System.Windows.Forms.Application]::Run($form)
`;

  const ps = spawn("powershell", [
    "-Sta",
    "-ExecutionPolicy", "Bypass",
    "-Command", psScript,
  ], { windowsHide: false });

  logger.info("Settings panel spawned", { pid: ps.pid });

  ps.on("exit", (code) => {
    logger.debug("Settings panel exited", { code });
  });

  ps.on("error", (err) => {
    logger.error("Settings panel error", { error: err.message });
  });
}

module.exports = { showSettingsPanel };
