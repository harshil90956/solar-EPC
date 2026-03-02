## GitHub Copilot Chat

- Extension Version: 0.27.3 (prod)
- VS Code: vscode/1.100.3
- OS: Mac

## Network

User Settings:
```json
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 20.207.73.85 (11 ms)
- DNS ipv6 Lookup: ::ffff:20.207.73.85 (7 ms)
- Proxy URL: None (8 ms)
- Electron fetch (configured): HTTP 200 (80 ms)
- Node.js https: HTTP 200 (123 ms)
- Node.js fetch: HTTP 200 (132 ms)
- Helix fetch: HTTP 200 (215 ms)

Connecting to https://api.individual.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.112.21 (4 ms)
- DNS ipv6 Lookup: ::ffff:140.82.112.21 (19 ms)
- Proxy URL: None (1 ms)
- Electron fetch (configured): HTTP 200 (266 ms)
- Node.js https: HTTP 200 (673 ms)
- Node.js fetch: HTTP 200 (863 ms)
- Helix fetch: HTTP 200 (815 ms)

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).