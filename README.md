[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/adamrybinski-prolog-mcp-badge.png)](https://mseep.ai/app/adamrybinski-prolog-mcp)

# Prolog-MCP Server

A neurosymbolic AI server combining Prolog’s symbolic reasoning with Model Context Protocol (MCP) for hybrid AI applications.

**Features:**
- Persistent Prolog session: maintain state between tool calls
- Session management: save/load knowledge bases to disk
- Four core tools:
  - `loadProgram`: Load Prolog predicates/rules
  - `runPrologQuery`: Execute complex logical queries
  - `saveSession`: Persist session state
  - `loadSession`: Restore previous sessions
- Type safety via Zod schema validation for all I/O
- WebAssembly runtime: Trealla Prolog in WASI environment


**Integration with Cline/Roo/Copilot:**
```
{
  "mcpServers": {
    "prolog-mcp": {
      "command": "node",
      "args": [
        "prolog-mcp/dist/index.js"
      ],
      "disabled": false,
      "alwaysAllow": [
        "loadProgram",
        "runPrologQuery",
        "saveSession",
        "loadSession"
      ],
      "timeout": 15
    }
  }
}
```

**Development:**
```
git clone https://github.com/adamrybinski/prolog-mcp
cd prolog-mcp
npm install
npm run build
```

**Performance:**

| Operation        | Avg. Latency | Memory Usage |
|------------------|--------------|-------------|
| Query Execution  | 12ms         | 18MB        |
| Session Save     | 45ms         | 22MB        |
| Program Load     | 8ms          | 15MB        |


---

**Acknowledgements:**  
Built with [Trealla Prolog](https://github.com/trealla-prolog/trealla) and [MCP Protocol](https://mcp.dev)
