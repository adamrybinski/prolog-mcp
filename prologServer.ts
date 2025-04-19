import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { load, Prolog, Answer } from "trealla"; // Import Answer type

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

import * as fs from 'fs';
import * as path from 'path';

/* Schemas for Prolog tools */
const LoadProgramSchema = z.object({
  program: z.string().describe("The Prolog program definitions to load"),
});

const RunPrologQuerySchema = z.object({
  query: z.string().describe("The Prolog query to execute"),
});

const SaveSessionSchema = z.object({
  filename: z.string().describe("The name to save the session under"),
});

const LoadSessionSchema = z.object({
  filename: z.string().describe("The name of the session to load"),
});

enum ToolName {
  LOAD_PROGRAM = "loadProgram",
  RUN_PROLOG_QUERY = "runPrologQuery",
  SAVE_SESSION = "saveSession",
  LOAD_SESSION = "loadSession",
}

// Sessions directory path relative to project root
const SESSIONS_DIR = './prolog-sessions';

export const createServer = async () => {
  // Load the Trealla runtime first
  await load();

  // Create a persistent Prolog instance that will be used across tool calls
  const pl = new Prolog();

  // Ensure sessions directory exists
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  const server = new Server(
    {
      name: "prolog-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        // Remove prompts, resources, logging if not needed
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = [
      {
        name: ToolName.LOAD_PROGRAM,
        description: "Loads Prolog program definitions that can be queried later",
        inputSchema: zodToJsonSchema(LoadProgramSchema) as ToolInput,
      },
      {
        name: ToolName.RUN_PROLOG_QUERY,
        description: "Executes a Trealla Prolog query against loaded definitions",
        inputSchema: zodToJsonSchema(RunPrologQuerySchema) as ToolInput,
      },
      {
        name: ToolName.SAVE_SESSION,
        description: "Saves the current Prolog session to a file for later loading",
        inputSchema: zodToJsonSchema(SaveSessionSchema) as ToolInput,
      },
      {
        name: ToolName.LOAD_SESSION,
        description: "Loads a previously saved Prolog session",
        inputSchema: zodToJsonSchema(LoadSessionSchema) as ToolInput,
      },
    ];
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: z.infer<typeof CallToolRequestSchema>) => {
    const { name, arguments: args } = request.params;

    if (name === ToolName.LOAD_PROGRAM) {
      const validatedArgs = LoadProgramSchema.parse(args);
      const program = validatedArgs.program;
      let error: any = null;
      let stderr = "";

      try {
        // Load the program definitions into the Prolog instance
        await pl.consultText(program);
      } catch (e) {
        error = e;
        stderr = String(e);
      }

      const responseContent = [];
      if (stderr) {
        responseContent.push({
          type: "text",
          text: `Error loading program:\n${stderr}`,
          annotations: { priority: 1.0 }
        });
      } else {
        responseContent.push({
          type: "text",
          text: "Program loaded successfully"
        });
      }

      return { content: responseContent };
    }

    if (name === ToolName.RUN_PROLOG_QUERY) {
      const validatedArgs = RunPrologQuerySchema.parse(args);
      const query = validatedArgs.query;
      let results = [];
      let stdout = "";
      let stderr = "";
      let error: any = null;

      try {
        // Use query generator to get all answers
        const queryGen = pl.query(query);
        for await (const answer of queryGen) { // Remove type annotation here
          if (answer.status === "success" && answer.answer) { // Check status and existence
             results.push(answer.answer); // Store each substitution set
          } else if (answer.status === "error" && answer.error) {
             // Handle potential error term if needed, or rely on catch block
             stderr += `Query error term: ${JSON.stringify(answer.error)}\n`;
          }
          if (answer.stdout) stdout += answer.stdout;
          if (answer.stderr) stderr += answer.stderr;
        }
      } catch (e) {
        error = e;
        stderr += String(e); // Capture error message
      }

      // Format the response
      const responseContent = [];
      if (stdout) {
        responseContent.push({ type: "text", text: `Stdout:\n${stdout}` });
      }
      if (stderr) {
        responseContent.push({ type: "text", text: `Stderr:\n${stderr}` });
      }
      if (results.length > 0) {
        responseContent.push({
          type: "text",
          text: `Results:\n${JSON.stringify(results, null, 2)}`,
        });
      }
      if (error) {
         responseContent.push({
           type: "text",
           text: `Error executing query: ${error.message || String(error)}`,
           annotations: { priority: 1.0, audience: ["user", "assistant"] }
         });
      }
      if (responseContent.length === 0 && !error) {
         responseContent.push({ type: "text", text: "Query succeeded with no output or results." });
      }


      return { content: responseContent };
    }

    if (name === ToolName.SAVE_SESSION) {
      const validatedArgs = SaveSessionSchema.parse(args);
      const filename = validatedArgs.filename;
      let error: any = null;

      try {
        // Get the current state of the Prolog program using listing/0
        const queryGen = pl.query("listing.");
        let program = "";
        for await (const answer of queryGen) {
          if (answer.stdout) program += answer.stdout + "\n";
        }

        // Save to file if we got any program content
        const sessionPath = path.join(SESSIONS_DIR, `${filename}.pl`);
        if (program.trim()) {
          fs.writeFileSync(sessionPath, program);
        } else {
          throw new Error("No program content to save");
        }

        return {
          content: [{
            type: "text",
            text: `Session saved to ${sessionPath}`
          }]
        };
      } catch (e) {
        error = e;
        return {
          content: [{
            type: "text",
            text: `Error saving session: ${e}`,
            annotations: { priority: 1.0 }
          }]
        };
      }
    }

    if (name === ToolName.LOAD_SESSION) {
      const validatedArgs = LoadSessionSchema.parse(args);
      const filename = validatedArgs.filename;
      let error: any = null;

      try {
        const sessionPath = path.join(SESSIONS_DIR, `${filename}.pl`);
        if (!fs.existsSync(sessionPath)) {
          throw new Error(`Session file ${sessionPath} not found`);
        }

        const sessionContent = fs.readFileSync(sessionPath, 'utf8');
        await pl.consultText(sessionContent);

        return {
          content: [{
            type: "text",
            text: `Session loaded from ${sessionPath}`
          }]
        };
      } catch (e) {
        error = e;
        return {
          content: [{
            type: "text",
            text: `Error loading session: ${e}`,
            annotations: { priority: 1.0 }
          }]
        };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  const cleanup = async () => {
    // Clean up any resources if needed when server shuts down
  };

  return { server, cleanup };
};
