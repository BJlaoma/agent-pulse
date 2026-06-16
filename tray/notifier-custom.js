const { spawn } = require("child_process");
const { writeFileSync, unlinkSync } = require("fs");
const { join } = require("path");
const { tmpdir } = require("os");
const logger = require("./logger.js");

const COLORS = {
  green: "34C759",
  yellow: "FF9F0A",
  red: "FF3B30",
  gray: "8E8E93",
};

const POSITIONS = {
  "bottom-right": { x: "screen - 340", y: "screenHeight - 120" },
  "bottom-left": { x: "20", y: "screenHeight - 120" },
  "top-right": { x: "screen - 340", y: "20" },
  "top-left": { x: "20", y: "20" },
};

function showCustomNotification(title, message, iconColor, config) {
  const position = config.notification.position || "bottom-right";
  const duration = config.notification.duration || 5000;
  const hexColor = COLORS[iconColor] || COLORS.gray;
  
  const pos = POSITIONS[position] || POSITIONS["bottom-right"];
  
  const tmpFile = join(tmpdir(), `agent-pulse-${Date.now()}.ps1`);
  
  // 使用 cmd /c start 启动 PowerShell，确保能显示 GUI 窗口
  const psScript = `
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore

$title = $env:AGENT_PULSE_TITLE
$message = $env:AGENT_PULSE_MESSAGE
$duration = $env:AGENT_PULSE_DURATION
$color = $env:AGENT_PULSE_COLOR

$window = New-Object System.Windows.Window
$window.WindowStyle = 'None'
$window.ResizeMode = 'NoResize'
$window.AllowsTransparency = $true
$window.Background = 'Transparent'
$window.Topmost = $true
$window.ShowInTaskbar = $false
$window.Width = 320
$window.Height = 100

$screen = [System.Windows.SystemParameters]::PrimaryScreenWidth
$screenHeight = [System.Windows.SystemParameters]::PrimaryScreenHeight

$window.Left = ${pos.x}
$window.Top = ${pos.y}

$border = New-Object System.Windows.Controls.Border
$border.CornerRadius = 8
$border.Background = '#FF2D2D2D'
$border.BorderBrush = '#FF' + $color
$border.BorderThickness = 2
$border.Padding = 15

$shadow = New-Object System.Windows.Media.Effects.DropShadowEffect
$shadow.Color = '#FF000000'
$shadow.BlurRadius = 10
$shadow.ShadowDepth = 5
$shadow.Opacity = 0.5
$border.Effect = $shadow

$grid = New-Object System.Windows.Controls.Grid
$grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition))
$grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition))

$titleBlock = New-Object System.Windows.Controls.TextBlock
$titleBlock.Text = $title
$titleBlock.Foreground = 'White'
$titleBlock.FontSize = 14
$titleBlock.FontWeight = 'Bold'
$titleBlock.Margin = '0,0,0,5'
[System.Windows.Controls.Grid]::SetRow($titleBlock, 0)
$grid.Children.Add($titleBlock)

$msgBlock = New-Object System.Windows.Controls.TextBlock
$msgBlock.Text = $message
$msgBlock.Foreground = '#CCCCCC'
$msgBlock.FontSize = 12
$msgBlock.TextWrapping = 'Wrap'
$msgBlock.MaxWidth = 290
[System.Windows.Controls.Grid]::SetRow($msgBlock, 1)
$grid.Children.Add($msgBlock)

$border.Child = $grid
$window.Content = $border

$window.Opacity = 0

$transform = New-Object System.Windows.Media.TranslateTransform
$transform.X = 100
$window.RenderTransform = $transform

$window.Show()

$storyboard = New-Object System.Windows.Media.Animation.Storyboard

$opacityAnimation = New-Object System.Windows.Media.Animation.DoubleAnimation
$opacityAnimation.From = 0
$opacityAnimation.To = 1
$opacityAnimation.Duration = [System.Windows.Duration]::FromSeconds(0.3)
$storyboard.Children.Add($opacityAnimation)
[System.Windows.Media.Animation.Storyboard]::SetTarget($opacityAnimation, $window)
[System.Windows.Media.Animation.Storyboard]::SetTargetProperty($opacityAnimation, (New-Object System.Windows.PropertyPath([System.Windows.UIElement]::OpacityProperty)))

$slideAnimation = New-Object System.Windows.Media.Animation.DoubleAnimation
$slideAnimation.From = 100
$slideAnimation.To = 0
$slideAnimation.Duration = [System.Windows.Duration]::FromSeconds(0.3)
$storyboard.Children.Add($slideAnimation)
[System.Windows.Media.Animation.Storyboard]::SetTarget($slideAnimation, $transform)
[System.Windows.Media.Animation.Storyboard]::SetTargetProperty($slideAnimation, (New-Object System.Windows.PropertyPath([System.Windows.Media.TranslateTransform]::XProperty)))

$storyboard.Begin()

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds($duration)
$timer.Add_Tick({
    $window.Close()
    $timer.Stop()
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.BeginInvokeShutdown('Background')
})
$timer.Start()

$window.Add_MouseLeftButtonDown({
    $window.Close()
    $timer.Stop()
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.BeginInvokeShutdown('Background')
})

[System.Windows.Threading.Dispatcher]::Run()

Remove-Item -Path "$env:AGENT_PULSE_TMPFILE" -ErrorAction SilentlyContinue
`;
  
  try {
    writeFileSync(tmpFile, psScript);
    
    const env = {
      ...process.env,
      AGENT_PULSE_TITLE: title,
      AGENT_PULSE_MESSAGE: message,
      AGENT_PULSE_COLOR: hexColor,
      AGENT_PULSE_DURATION: duration.toString(),
      AGENT_PULSE_TMPFILE: tmpFile,
    };
    
    logger.info("Launching custom notification", { title, position, duration });
    
    // 使用 cmd /c start 启动 PowerShell，确保能创建 GUI 窗口
    const ps = spawn("cmd", ["/c", "start", "powershell", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", tmpFile], {
      windowsHide: true,
      detached: true,
      env,
    });
    
    ps.on("exit", (code) => {
      logger.debug("Custom notification process exited", { code });
      try { unlinkSync(tmpFile); } catch(e) {}
    });
    
    ps.on("error", (err) => {
      logger.error("Custom notification process error", { error: err.message });
      try { unlinkSync(tmpFile); } catch(e) {}
    });
    
  } catch (e) {
    logger.error("Failed to launch custom notification", { error: e.message });
    throw e;
  }
}

module.exports = { showCustomNotification };
