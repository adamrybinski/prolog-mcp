

[![Insignia de Evaluación de Seguridad de MseeP.ai](https://mseep.net/pr/adamrybinski-prolog-mcp-badge.png)](https://mseep.ai/app/adamrybinski-prolog-mcp)

# Servidor Prolog-MCP

Un servidor de IA neurosimbólica que combina el razonamiento simbólico de Prolog con el Protocolo de Contexto de Modelo (MCP) para aplicaciones de IA híbridas.

**Características:**
- Sesión persistente de Prolog: mantiene el estado entre llamadas a herramientas
- Gestión de sesiones: guardar/cargar bases de conocimiento en disco
- Cuatro herramientas principales:
  - `loadProgram`: Cargar predicados/reglas de Prolog
  - `runPrologQuery`: Ejecutar consultas lógicas complejas
  - `saveSession`: Persistir el estado de la sesión
  - `loadSession`: Restaurar sesiones anteriores
- Seguridad de tipos mediante validación de esquemas Zod para todas las entradas/salidas (I/O)
- Entorno de ejecución WebAssembly: Trealla Prolog en entorno WASI


**Integración con Cline/Roo/Copilot:**
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

**Desarrollo:**
```
git clone https://github.com/adamrybinski/prolog-mcp
cd prolog-mcp
npm install
npm run build
```

**Rendimiento:**

| Operación        | Latencia Promedio | Uso de Memoria |
|------------------|-------------------|----------------|
| Ejecución de Consultas | 12ms      | 18MB           |
| Guardado de Sesión     | 45ms      | 22MB           |
| Carga de Programa      | 8ms       | 15MB           |


---

**Agradecimientos:**  
Construido con [Trealla Prolog](https://github.com/trealla-prolog/trealla) y [Protocolo MCP](https://mcp.dev)
