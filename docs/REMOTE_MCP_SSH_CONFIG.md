# 🌐 Conexão Remota MCP via SSH para o Canal O OUTRO LADO & Chief YouTube

Configuração pronta para outro computador (**PC 2**) consultar em tempo real os MCPs do **PC 1** (`192.168.0.4`):

```json
{
  "mcpServers": {
    "chief-youtube": {
      "command": "ssh",
      "args": [
        "brend@192.168.0.4",
        "python",
        "\"D:/CHIEF YOUTUBE/src/mcp/youtube_analytics_mcp.py\""
      ],
      "type": "stdio"
    },
    "hermes-codex-bridge": {
      "command": "ssh",
      "args": [
        "brend@192.168.0.4",
        "python",
        "\"D:/CHIEF YOUTUBE/src/mcp/hermes_codex_bridge_mcp.py\""
      ],
      "type": "stdio"
    },
    "el-profe-de-velas": {
      "command": "ssh",
      "args": [
        "brend@192.168.0.4",
        "python",
        "\"D:/CHIEF YOUTUBE/src/mcp/hermes_codex_bridge_mcp.py\""
      ],
      "type": "stdio"
    }
  }
}
```

### Configuração no PC 1 (Ativar OpenSSH Server como Admin):
```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
```

### Teste a partir do PC 2:
```bash
ssh brend@192.168.0.4 "python -c \"print('Conectado!')\""
```
