const { spawn } = require("child_process");
const { join } = require("path");

/**
 * Create a custom notification popup at specified position using PowerShell WPF
 * 
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} iconColor - Color name (green/yellow/red/gray)
 * @param {object} config - Notification config
 */
function showCustomNotification(title, message, iconColor, config) {
  if (!config.notification.enabled) {
    return;
  }

  // Position mapping
  const positions = {
    "bottom-left": { x: 20, y: -100, alignX: "Left", alignY: "Bottom" },
    "bottom-right": { x: -20, y: -100, alignX: "Right", alignY: "Bottom" },
    "top-left": { x: 20, y: 20, alignX: "Left", alignY: "Top" },
    "top-right": { x: -20, y: 20, alignX: "Right", alignY: "Top" },
  };

  const pos = positions[config.notification.position] || positions["bottom-right"];
  const duration = config.notification.duration || 5000;
  const width = config.notification.width || 320;
  const height = config.notification.height || 100;

  // Color mapping
  const colors = {
    green: "#34C759",
    yellow: "#FF9F0A",
    red: "#FF3B30",
    gray: "#8E8E93",
  };
  const accentColor = colors[iconColor] || colors.gray;

  const psScript = `
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore

$window = New-Object System.Windows.Window
$window.Width = ${width}
$window.Height = ${height}
$window.WindowStyle = 'None'
$window.ResizeMode = 'NoResize'
$window.AllowsTransparency = $true
$window.Background = 'Transparent'
$window.Topmost = $true
$window.ShowInTaskbar = $false

# Position
$screen = [System.Windows.SystemParameters]::PrimaryScreenWidth
$screenHeight = [System.Windows.SystemParameters]::PrimaryScreenHeight

if ($screen -eq 0) { $screen = 1920 }
if ($screenHeight -eq 0) { $screenHeight = 1080 }

$x = ${pos.x}
$y = ${pos.y}

if ($x -lt 0) { $x = $screen + $x - ${width} }
if ($y -lt 0) { $y = $screenHeight + $y - ${height} }

$window.Left = $x
$window.Top = $y

# Border
$border = New-Object System.Windows.Controls.Border
$border.CornerRadius = 8
$border.Background = '#CC1E1E1E'
$border.BorderBrush = '${accentColor}'
$border.BorderThickness = 3
$border.Padding = 15

# Grid
$grid = New-Object System.Windows.Controls.Grid
$grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition))
$grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition))

# Title
$titleBlock = New-Object System.Windows.Controls.TextBlock
$titleBlock.Text = '${title}'
$titleBlock.Foreground = 'White'
$titleBlock.FontSize = 14
$titleBlock.FontWeight = 'Bold'
$titleBlock.Margin = '0,0,0,5'
[System.Windows.Controls.Grid]::SetRow($titleBlock, 0)
$grid.Children.Add($titleBlock)

# Message
$msgBlock = New-Object System.Windows.Controls.TextBlock
$msgBlock.Text = '${message}'
$msgBlock.Foreground = '#CCCCCC'
$msgBlock.FontSize = 12
$msgBlock.TextWrapping = 'Wrap'
$msgBlock.MaxWidth = ${width - 30}
[System.Windows.Controls.Grid]::SetRow($msgBlock, 1)
$grid.Children.Add($msgBlock)

$border.Child = $grid
$window.Content = $border

# Show
$window.Show()

# Auto close
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(${duration})
$timer.Add_Tick({
    $window.Close()
    $timer.Stop()
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.BeginInvokeShutdown('Background')
})
$timer.Start()

# Close on click
$window.Add_MouseLeftButtonDown({
    $window.Close()
    $timer.Stop()
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.BeginInvokeShutdown('Background')
})

# Run dispatcher
[System.Windows.Threading.Dispatcher]::Run()
`;

  // Execute PowerShell
  const ps = spawn("powershell", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-Command", psScript,
  ], {
    windowsHide: true,
    detached: true,
  });

  ps.on("error", (err) => {
    console.error("[Agent Pulse] Custom notification failed:", err.message);
  });
}

module.exports = { showCustomNotification };
