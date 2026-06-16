const { spawn } = require("child_process");

function testNotification() {
  const psScript = `Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Test notification', 'Agent Pulse', 'OK', 'Information')`;
  
  const ps = spawn("powershell", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-Command", psScript,
  ], {
    windowsHide: true,
  });
  
  ps.on("error", (err) => {
    console.error("PS error:", err.message);
  });
  
  ps.on("exit", (code) => {
    console.log("PS exited:", code);
  });
}

module.exports = { testNotification };
