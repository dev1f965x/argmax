@AGENTS.md

## Claude Code

- The Playwright MCP server (`.mcp.json`) opens the app for screenshots; its output goes to `/tmp/playwright-mcp`.
- The design plugins (frontend-design, Impeccable) are enabled in `.claude/settings.json`. Product UI here is restrained: follow DESIGN.md over any plugin default.
- The container and the owner's WSL terminal share this working tree. Do not switch the checked-out branch while the owner works in it; use a separate `git worktree`.
- Have changes reviewed by a separate agent that did not write them before handing them to the owner.
