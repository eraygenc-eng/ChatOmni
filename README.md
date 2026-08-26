# ChatOmni

**ChatOmni** is a modular, multi-user general-purpose AI assistant built with Python, LangChain, LangGraph, FastAPI, React, PostgreSQL, Docker, and OpenAI models.

The project combines general-purpose conversational reasoning with specialized tools and persistent application state. The current feature set includes:

- Real-time web search
- Mathematical calculations
- Currency conversion
- Retrieval-Augmented Generation (RAG)
- Persistent multi-chat conversation history
- Persistent long-term user memory
- User registration, login, logout, and JWT-based authentication
- Per-user chat, memory, and project isolation
- Persistent project workspaces with ZIP codebase upload
- Scope-aware project analysis with targeted, scoped, and deep review modes
- Exact project statistics such as file counts and line counts
- Batched continuation for large whole-project deep reviews
- Image and screenshot understanding
- DOCX, code, and text file analysis
- Multi-language code execution in isolated Docker sandboxes
- Downloadable source-code generation
- Selectable GPT-5.6 Luna / GPT-5.6 Terra models
- A React-based graphical chat interface

Unlike a traditional question-answering chatbot, ChatOmni is designed as a **tool-using AI agent**. The selected language model can decide whether a request should be answered directly or whether a specialized tool should be called.

The core application is feature-complete, fully Dockerized, and deployed on **AWS EC2**. Nginx serves the React production build and acts as a reverse proxy for the FastAPI API, while Docker Compose orchestrates the frontend, backend, PostgreSQL, persistent storage, and sandbox runtime.

## Live Deployment

- **Live Application:** [http://63.183.71.155](http://63.183.71.155)
- **Demo Video:** [Watch ChatOmni Demo on YouTube](https://youtu.be/_QjIn1FM8JY)

> **Public Deployment Notice**
>
> ChatOmni is a complete working project deployed on AWS EC2. The public instance is available for portfolio review and hands-on evaluation, but it is not intended to remain online 24/7 because of cloud infrastructure costs.
>
> The current public endpoint uses **HTTP rather than HTTPS**. Please do not use real, sensitive, or reused passwords when creating an account. Use temporary test credentials only.
>
> If the deployment is offline when you would like to review the project, please contact me by email and I can start the AWS instance for evaluation.

---

## Architecture Overview

```text
                                  User
                                   │
                                   ▼
                            HTTP / Elastic IP
                                   │
                                   ▼
                              AWS EC2
                                   │
                                   ▼
                                Nginx
                          ┌────────┴────────┐
                          │                 │
                          ▼                 ▼
                 React Production       /api/*
                     Frontend               │
                                            ▼
                                         FastAPI
                                            │
                 ┌──────────────────────────┼──────────────────────────┐
                 │                          │                          │
                 ▼                          ▼                          ▼
          Authentication               Chat / Agent              Projects / Files
                 │                          │                          │
                 │                          ▼                          │
                 │                   Model Selection                   │
                 │                   Luna / Terra                      │
                 │                          │                          │
                 │                          ▼                          │
                 │                    ChatOmni Agent                   │
                 │                          │                          │
                 │          ┌───────────────┼───────────────┐          │
                 │          │               │               │          │
                 │          ▼               ▼               ▼          │
                 │      Direct Reply       Tools          Memory       │
                 │                          │                          │
                 │       ┌──────────────────┼──────────────────┐       │
                 │       │        │         │        │         │       │
                 │       ▼        ▼         ▼        ▼         ▼       │
                 │      Web   Calculator Currency   RAG    Sandbox     │
                 │                                      / Generated   │
                 │                                          Files     │
                 └──────────────────────────┬───────────────────────────┘
                                            │
                              ┌─────────────┴─────────────┐
                              │                           │
                              ▼                           ▼
                         PostgreSQL                 Persistent Files
                              │                           │
                    ┌─────────┼─────────┐        ┌────────┼────────┐
                    │         │         │        │        │        │
                    ▼         ▼         ▼        ▼        ▼        ▼
                  Users     Chats     Memory   Projects  Images   Code
                              │
                              ▼
                       LangGraph Checkpoints
```

At runtime, authenticated users receive their own application context. Conversation threads are namespaced per user, project ownership is checked with the authenticated user ID, and protected upload/download requests require a valid JWT. In production, browser requests enter through Nginx; frontend routes are served by React and `/api/*` requests are proxied internally to FastAPI.

---

# Current Features

## Conversational AI

ChatOmni supports natural general-purpose conversation using OpenAI language models through LangChain.

The assistant can:

- Answer general questions
- Explain technical and non-technical topics
- Follow conversational instructions
- Maintain context across messages
- Respond naturally in both **English and Turkish**
- Automatically adapt to the language used by the user
- Generate Markdown-formatted responses
- Render mathematical expressions using LaTeX

ChatOmni currently supports two selectable models:

```text
GPT-5.6 Luna
GPT-5.6 Terra
```

**GPT-5.6 Luna** is the default model and is intended for everyday conversations, general questions, and tasks where faster and more cost-efficient responses are preferred.

**GPT-5.6 Terra** can be selected manually for more demanding tasks such as advanced coding, debugging, architecture discussions, deeper analysis, and other complex requests.

---

# Model Selection

ChatOmni includes a model selector directly inside the React chat interface.

Users can switch between:

```text
GPT-5.6 Luna
        or
GPT-5.6 Terra
```

before sending a message.

Conceptually:

```text
User
  │
  ▼
Model Selector
  │
  ├─────────────── GPT-5.6 Luna
  │
  └─────────────── GPT-5.6 Terra
  │
  ▼
ChatOmni Agent
```

The selected model is sent together with the chat request to FastAPI.

The backend then loads the corresponding ChatOmni agent configuration.

```text
React
  │
  ▼
Selected Model
  │
  ▼
POST /chat/stream
  │
  ▼
FastAPI
  │
  ▼
get_agent(model)
  │
  ▼
Luna or Terra
```

ChatOmni maintains separate cached agent configurations for the two models while sharing the same conversation persistence, memory system, tools, and LangGraph runtime.

This means a user can switch models during a conversation without starting a completely separate chat.

New conversations start with **GPT-5.6 Luna** by default.

---

# Task-Fit Model Suggestions

ChatOmni also includes a lightweight model recommendation system.

The recommendation system analyzes basic properties of the request, such as:

- Request length
- Code attachments
- Code blocks
- Multi-line technical content
- Coding and debugging terminology
- Architecture-related terminology
- Analysis-oriented terminology
- Whether the current turn actually invoked a whole-project `project_search` deep review

This classification is performed locally using lightweight request heuristics plus observed tool usage and does **not require an additional language-model request**.

For project conversations, this also prevents short continuation messages such as `Continue` from being misclassified as trivial when the current turn is still performing a deep codebase review. At the same time, an old deep-review turn does not cause unrelated later questions in the same chat to keep receiving a Terra recommendation.

The recommendation system does not automatically interrupt or redirect the user's request.

The selected model first answers normally.

After the response completes, ChatOmni may display a suggestion.

Example:

```text
Selected model:
GPT-5.6 Luna

User:
Analyze this backend architecture,
identify concurrency issues,
and propose a safer redesign.

ChatOmni:
[normal answer]

Tip:
This task may benefit from GPT-5.6 Terra.

[Switch to Terra]
```

The reverse can also happen.

```text
Selected model:
GPT-5.6 Terra

User:
What is 2 + 2?

ChatOmni:
4

Tip:
GPT-5.6 Luna may be faster and more cost-efficient
for this type of request.

[Switch to Luna]
```

The recommendation is therefore advisory rather than mandatory.

The user always remains in control of the selected model.

---

# Agent Architecture

ChatOmni uses a LangChain agent instead of manually routing every request.

The selected model powers the same underlying agent architecture.

The agent determines whether it should:

- Answer directly with the language model
- Use the calculator
- Search the web
- Convert currencies
- Query the currently loaded PDF
- Execute code
- Create downloadable code files
- Search and inspect project codebases
- Calculate exact project file/line statistics
- Save long-term memory
- Retrieve previously stored memory

Conceptually:

```text
                         User
                           │
                           ▼
                     Model Selector
                           │
               ┌───────────┴───────────┐
               │                       │
               ▼                       ▼
         GPT-5.6 Luna            GPT-5.6 Terra
               │                       │
               └───────────┬───────────┘
                           │
                           ▼
                    ChatOmni Agent
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
  Direct Response       Tool Calls        Memory
                           │
         ┌─────────────────┼───────────────────────────────┐
         │                 │               │               │
         ▼                 ▼               ▼               ▼
  Calculator          Web Search       Currency           RAG
         │
         ├────────────── Code Sandbox
         │
         └────────────── Code File Generator

                           │
                           ▼
                      PostgreSQL
```

This architecture allows new capabilities to be introduced as independent tools without redesigning the whole application.

---

# Real-Time Web Search

ChatOmni can access current information using OpenAI web search.

This allows the assistant to answer questions that cannot reliably be answered using only the language model's internal knowledge.

Examples:

```text
What happened in AI news today?

Who currently holds a specific public position?

What are the latest developments in a technology?
```

When web search is used, ChatOmni can detect the web-search usage and expose source information to the frontend.

---

# Mathematical Calculations

ChatOmni contains a dedicated calculator tool for reliable arithmetic operations.

Currently supported operations include:

- Addition
- Subtraction
- Multiplication
- Division

Example:

```text
What is 256 × 73?
```

Instead of relying entirely on the language model to perform arithmetic, the agent can call the calculator tool and use the returned result when constructing the final answer.

---

# Currency Conversion

ChatOmni includes a dedicated currency conversion tool using the **Frankfurter API**.

Example questions:

```text
How much is 500 EUR in TRY?

Convert 100 USD to EUR.

How much is 5000 DKK in TRY?
```

The agent automatically extracts:

```text
Amount
Source currency
Target currency
```

and calls the currency conversion tool when required.

Frankfurter provides reference exchange rates from official financial data sources without requiring a separate API key.

> Reference exchange rates may differ slightly from real-time trading or financial-market prices.

---

# RAG PDF Assistant Integration

One of the main features of ChatOmni is the integration of my previous **RAG PDF Assistant** project.

The original RAG application was refactored into a reusable Python package:

```text
rag_pdf_assistant
```

ChatOmni imports the RAG system through:

```python
from rag_pdf_assistant import RAGPipeline
```

The RAG functionality is therefore maintained as an independently reusable project while being available to ChatOmni as one of its tools.

When ChatOmni runs through Docker, the reusable `rag_pdf_assistant` package is automatically installed into the backend image during the Docker build process.

When running ChatOmni directly on the host instead of Docker, the package must be installed in the active Python environment before RAG functionality can be used.

The RAG system is exposed to the ChatOmni agent as:

```text
rag_pdf
```

This allows the agent to automatically recognize PDF-related questions and call the RAG pipeline when required.

---

# PDF Upload from the Web Interface

PDF files can now be uploaded directly from the React interface.

The frontend sends the selected document to FastAPI:

```text
React
  │
  ▼
POST /upload-pdf
  │
  ▼
FastAPI
  │
  ▼
set_rag_pdf()
  │
  ▼
RAGPipeline
```

The PDF upload endpoint is protected by JWT authentication.

Once the PDF is loaded, the user can ask questions naturally:

```text
Summarize this PDF.

According to the document, how will the revenue be distributed?

What does this abbreviation mean in the uploaded document?
```

Loading a new PDF resets the previous RAG pipeline and initializes the new document when required.

---

# RAG Retrieval Pipeline

The integrated RAG system uses a multi-stage retrieval architecture.

```text
User Question
      │
      ▼
Original Query Search
      +
Rewritten Query Search
      +
Exact-Term Search
      │
      ▼
Merge & Deduplication
      │
      ▼
CrossEncoder Reranking
      │
      ▼
Most Relevant Chunks
      │
      ▼
LLM Answer Generation
```

The retrieval system combines several search strategies instead of relying only on semantic vector similarity.

This improves retrieval quality for:

- Direct questions
- Complex questions
- Abbreviations
- Exact terminology
- Questions where semantic similarity alone is insufficient

The same retrieval flow used by the standalone RAG application is used inside ChatOmni.

---

# Image and Screenshot Understanding

ChatOmni supports multimodal image input.

Users can upload:

- Screenshots
- Error messages
- Charts
- Diagrams
- Application interfaces
- General images

Supported formats currently include:

```text
PNG
JPG / JPEG
WEBP
```

Screenshots can also be pasted directly into the message box using:

```text
Ctrl + V
```

The frontend uploads the image to FastAPI and sends the corresponding image identifier together with the conversation request.

The image upload endpoint is protected by JWT authentication.

Conceptually:

```text
Image / Screenshot
       │
       ▼
React Frontend
       │
       ▼
POST /upload-image
       │
       ▼
FastAPI
       │
       ▼
Multimodal User Message
       │
       ▼
ChatOmni Agent
```

Example:

```text
[Paste screenshot]

Why am I getting this error?
```

ChatOmni can analyze the visual content and use it as part of the conversation.

This feature focuses on **image understanding**, not image generation.

---

# True Response Streaming

ChatOmni supports genuine model token streaming.

Responses begin appearing while the selected language model is generating them instead of waiting for the complete answer.

```text
User
  │
  ▼
Agent
  │
  ▼
Model starts generating
  │
  ▼
First tokens appear
  │
  ▼
More tokens stream
  │
  ▼
Response completes
```

This is real model streaming rather than a frontend typing animation.

Streaming also works after tool calls.

For example:

```text
User Request
     │
     ▼
Tool Execution
     │
     ▼
Tool Result
     │
     ▼
Model Response
     │
     ▼
Token Streaming
```

The frontend also provides a **Stop** button that allows an active response to be cancelled.

---

# Persistent Conversation History

ChatOmni supports multiple persistent chat sessions.

Each chat receives its own unique `chat_id`.

For authenticated users, the LangGraph conversation thread is namespaced with both the user ID and chat ID:

```text
user_id : chat_id
```

Conversation state is stored using a PostgreSQL-backed LangGraph checkpointer.

This allows ChatOmni to:

- Maintain multiple conversations
- Save conversation history
- Reopen previous chats
- Continue previous conversations after restarting the application
- Keep different chats isolated from one another
- Delete individual conversations

Conversation history is separate from long-term user-profile memory.

Switching between Luna and Terra does not require creating a new conversation.

Both models can operate on the same persistent conversation state.

---

# Automatic Chat Titles

New chats automatically receive short titles based on the beginning of the conversation.

Examples:

```text
Python Debugging Help

RAG Architecture Discussion

Currency Conversion

Docker Sandbox Test
```

These titles are stored in PostgreSQL and displayed in the React sidebar.

The frontend automatically refreshes the conversation list after new messages.

---

# Long-Term User Memory

ChatOmni includes persistent long-term memory backed by PostgreSQL through a LangGraph store.

This allows useful user information to remain available even when:

```text
ChatOmni closes
        ↓
Application restarts
        ↓
A new conversation begins
```

The assistant can:

- Save information when the user explicitly asks it to remember something
- Retrieve previously saved information when relevant
- Store stable profile information
- Keep long-term profile memory separate from conversation history

Examples of information that may be stored include:

- Preferred name
- University or academic program
- Professional role
- Main field of study
- Long-term academic goals
- Career goals
- Important ongoing projects

Conceptually:

```text
                 PostgreSQL
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
Conversation State       Long-Term Memory
   LangGraph                  Store
 Checkpointer
```

The persistent memory system is shared across model selection, allowing Luna and Terra to access the same user context when appropriate.

Long-term memory is scoped to the authenticated user, so separate users do not share the same persistent memory namespace.

---

# User Authentication and Multi-User Isolation

ChatOmni includes a minimal multi-user authentication system built directly into the FastAPI backend and React frontend.

The authentication flow supports:

- User registration
- User login
- User logout
- Password hashing with Argon2
- JWT access tokens
- Authenticated `/auth/me` session restoration
- Protected chat, project, upload, and generated-file endpoints

Conceptually:

```text
Register / Login
      │
      ▼
FastAPI Auth
      │
      ├── Password Hashing (Argon2)
      │
      └── JWT Access Token
                │
                ▼
         React Frontend
                │
                ▼
   Authorization: Bearer <token>
                │
                ▼
        Protected FastAPI APIs
                │
                ▼
         Authenticated user_id
```

The authenticated user ID is used to isolate user-owned application state.

Conversation threads are namespaced using both the user ID and chat ID:

```text
user_id : chat_id
```

This prevents two users from sharing the same LangGraph conversation thread even if the same chat identifier were used.

Chat metadata and project ownership are also filtered by the authenticated user ID.

The authentication layer has been tested with multiple accounts to confirm that one user cannot see another user's chat list or project list.

---

# Persistent Projects

ChatOmni includes persistent project workspaces for working with larger codebases across multiple conversations.

A user can create a project from the sidebar and upload a ZIP codebase once.

Conceptually:

```text
Authenticated User
       │
       ▼
   New Project
       │
       ▼
   Upload ZIP
       │
       ▼
Secure Extraction
       │
       ▼
Persistent Project Files
       │
       ├────────────── Project Chat 1
       ├────────────── Project Chat 2
       └────────────── Project Chat 3
```

Each project has its own unique `project_id` and belongs to a specific authenticated user.

Normal chats use:

```text
project_id = null
```

while project chats carry the corresponding project ID.

Project files persist across project chats and application restarts, so the same codebase does not need to be uploaded again for every conversation. Project chats are persisted and shown under their owning project in the sidebar, and project deletion removes the project's saved chats, file metadata, and stored project directory.

ChatOmni does not blindly send the entire project to the model on every request. Project analysis is scope-aware: when a user asks about a specific file or module, the system retrieves the relevant project content for that request.

Project retrieval currently supports three scopes:

- **Targeted** — a named file/path is resolved and only that file is inspected.
- **Scoped** — a requested folder or module is inspected without pulling unrelated files.
- **Deep** — the whole readable project, or an explicitly requested set of extensions such as `.cs`, `.py`, or `.js`, is reviewed in ordered batches.

For large deep reviews, ChatOmni intentionally processes only a limited number of batches per assistant turn and then resumes from the next batch when the user asks to continue. This prevents long periods with no streamed output and avoids the idle/network timeouts that can occur when a large codebase is forced through one extremely long tool loop.

Simple project statistics do not use semantic retrieval. The dedicated `project_stats` tool reads project files directly and can return exact values such as:

- Number of files matching an extension
- Total line count for those files
- Per-file line counts
- Extension distribution

This allows questions such as `How many .cs files are in this project?` or `How many total lines are in my .py files?` to be answered without scanning hundreds of retrieval chunks.

Deep-review extension filtering is dynamic rather than language-specific. If a user explicitly requests `.cs`, `.py`, `.js`, or another supported readable extension, only those files are included; a request to review the entire project keeps the full readable project scope.

Project retrieval can also parse readable DOCX content inside project workspaces while continuing to exclude sensitive environment/credential files from model retrieval.

The project API checks project ownership before allowing access to project chats, project files, ZIP uploads, or project deletion.

---

# Multi-Chat React Interface

ChatOmni includes a graphical chat interface built with **React + Vite**.

The interface includes:

- Login and registration screens
- Authenticated user information and logout control
- Persistent conversation sidebar
- Projects and project chats
- New Chat button
- Automatic chat titles
- Reopening saved chats
- Chat deletion
- Dark and light themes
- Collapsible sidebar
- Streaming assistant responses
- Thinking indicator
- Stop-generation button
- PDF, image, code, and text file attachments
- Markdown rendering
- LaTeX rendering
- Code blocks
- Code-copy buttons
- Tool-use indicators
- Luna / Terra model selector
- Task-fit model suggestions
- One-click model switching from recommendation hints

Conceptually:

```text
┌──────────────────────────────────────────────────────────┐
│ ChatOmni                                           Theme │
├──────────────────┬───────────────────────────────────────┤
│ User / Log out   │                                       │
│ New Chat         │                                       │
│                  │            Conversation               │
│ PROJECTS         │                                       │
│ Project 1        │         User / Assistant              │
│   Project Chat   │                                       │
│                  │                                       │
│ CHATS            │    PDF / Image / Code Upload          │
│ Chat 1           │    Model: Luna ▼                      │
│ Chat 2           │                                       │
└──────────────────┴───────────────────────────────────────┘
```

The interface was designed to behave more like a modern conversational AI application rather than a terminal-only chatbot.

---

# Tool Usage Indicators

When ChatOmni uses a tool, a small indicator appears next to the assistant response.

Current tool indicators include:

```text
Memory
Web
Calculator
Currency
RAG
Project Search
Project Stats
Code Sandbox
Create Code File
```

This allows the user to understand when the model answered directly and when an external tool was involved.

---

# Markdown and LaTeX Rendering

Assistant responses are rendered using:

- `react-markdown`
- `remark-gfm`
- `remark-math`
- `rehype-katex`
- KaTeX

The interface supports:

- Headings
- Lists
- Tables
- Blockquotes
- Inline code
- Code blocks
- Mathematical expressions
- GitHub-Flavored Markdown

---

# Code Block Copy

Generated code blocks include a dedicated **Copy** button.

Example:

```text
┌─────────────────────────────────────────┐
│                                  Copy   │
│                                         │
│ def hello():                            │
│     print("Hello ChatOmni")             │
│                                         │
└─────────────────────────────────────────┘
```

When pressed, the entire code block is copied to the clipboard and the button briefly changes to:

```text
Copied
```

---

# DOCX Document Upload

ChatOmni can directly read Microsoft Word `.docx` documents uploaded through the chat interface.

The backend parses both normal paragraphs and table cells using `python-docx`, extracts readable text, and makes that text available to the same chat-analysis workflow used for uploaded code/text content.

Conceptually:

```text
DOCX
  │
  ▼
React
  │
  ▼
POST /upload-document
  │
  ▼
python-docx
  │
  ▼
Paragraph + Table Text Extraction
  │
  ▼
ChatOmni Agent
```

The current DOCX upload limit is **10 MB**. Empty or unreadable documents are rejected with a clear API error.

---

# Code and Text File Upload

ChatOmni can directly receive source-code and text files through the chat interface.

ChatOmni accepts a broad set of readable source-code, markup, configuration, data, and text formats. Examples include:

```text
.txt / .md / .csv
.json / .xml / .yaml / .toml / .ini / .cfg
.html / .css / .scss
.js / .jsx / .ts / .tsx
.py / .pyw
.java / .kt / .scala
.c / .h / .cpp / .hpp
.cs / .vb / .fs
.go / .rs / .swift / .dart
.php / .rb
.sh / .bash / .ps1 / .bat
.sql / .graphql / .proto
.vue / .svelte
.r / .lua / .pl
.ex / .erl / .clj
.groovy / .gradle
.tex / .bib
.asm
.ipynb
```

Uploaded files are validated as readable text and passed to the assistant for analysis. DOCX documents use the separate document-upload pipeline described above.

Code and text upload requests require an authenticated user.

Example:

```text
[Upload main.cpp]

Explain what this code does.
```

Uploading a code file **does not automatically execute it**.

The assistant only executes the file if the user explicitly requests execution.

Example:

```text
[Upload test.py]

Run this file and tell me the output.
```

In this case, the assistant can send the code to the Code Sandbox.

---

# Multi-Language Code Sandbox

ChatOmni includes a Docker-based code execution tool.

The sandbox currently supports:

- Python
- JavaScript
- Java
- C
- C++
- C#
- Go

The agent can use the sandbox when the user asks it to:

- Run code
- Test code
- Verify program output
- Debug code through execution

Example:

```text
Run this Python code and tell me the output.

print(sum(range(1, 101)))
```

ChatOmni can execute the code and return:

```text
5050
```

The same system can execute uploaded source-code files when explicitly requested.

---

# Sandbox Architecture

Each supported language runs inside its own Docker image.

```text
ChatOmni Agent
      │
      ▼
code_sandbox
      │
      ▼
run_code_sandbox()
      │
      ▼
Language Configuration
      │
      ▼
Docker Container
      │
      ▼
Compile if required
      │
      ▼
Execute
      │
      ▼
stdout / stderr / exit code
```

Current sandbox images include:

```text
chatomni-python-sandbox
chatomni-javascript-sandbox
chatomni-java-sandbox
chatomni-gcc-sandbox
chatomni-csharp-sandbox
chatomni-go-sandbox
```

---

# Sandbox Isolation

Execution containers are created as short-lived isolated Docker containers.

Current restrictions include:

- No network access
- Read-only container filesystem
- Non-root execution
- Memory limits
- CPU limits
- Process limits
- Dropped Linux capabilities
- `no-new-privileges`
- Temporary writable `/tmp`
- Execution timeout
- Automatic container removal
- Maximum input-code size
- Maximum returned-output size

Example execution configuration:

```text
--network none
--read-only
--memory ...
--memory-swap ...
--cpus ...
--pids-limit 64
--cap-drop ALL
--security-opt no-new-privileges:true
--user 10001:10001
```

Different languages receive different resource and temporary-directory configurations depending on whether compilation and executable files are required.

> Docker-based sandboxing provides useful isolation for the current ChatOmni implementation, but Docker containers should not be treated as a perfect security boundary for an unrestricted public arbitrary-code execution service.

---

# Code File Generation

ChatOmni can create real downloadable source-code files.

When a user explicitly asks:

```text
Give this code to me as app.py.

Create Program.cs.

Provide this as main.cpp.
```

the agent can call:

```text
create_code_file
```

The tool creates a generated file and returns information including:

```text
file_id
filename
extension
size
```

Supported generated file formats currently include:

```text
.py
.js
.mjs
.cjs
.java
.c
.h
.cpp
.cc
.cxx
.hpp
.cs
.go
.txt
```

---

# Generated File Download

Generated source-code files are exposed through FastAPI using a dedicated download endpoint:

```text
GET /generated-files/{file_id}
```

The React interface receives a generated-file stream event and displays a download card.

Generated-file downloads are protected by JWT authentication.

Example:

```text
CODE   EnemyFollow.cs   Download
```

When supported by the browser, pressing **Download** opens the system's **Save As** dialog so the user can choose where the generated file should be stored.

This separates:

```text
Server-side generated copy
          │
          ▼
uploads/generated/
```

from:

```text
User-selected download location
```

---

# Combined Coding Workflow

ChatOmni can combine multiple coding capabilities.

Example request:

```text
Write a C++ program,
run it to verify that it works,
and give it to me as main.cpp.
```

Possible agent workflow:

```text
User Request
     │
     ▼
Generate Code
     │
     ▼
Code Sandbox
     │
     ▼
Execution Successful
     │
     ▼
Create Code File
     │
     ▼
main.cpp
     │
     ▼
Download
```

This allows code generation, execution, debugging, and file delivery to work as parts of the same agent workflow.

---

# Multi-Tool Agent Behavior

Because ChatOmni uses an agent architecture, several tools can be used sequentially for a single request.

Example:

```text
Convert 100 USD and 200 EUR to TRY and calculate the total.
```

Possible workflow:

```text
USD → TRY
     +
EUR → TRY
     +
Calculator
     ↓
Final Answer
```

Coding requests can similarly combine:

```text
Code Sandbox
     +
Create Code File
     ↓
Final Answer + Download
```

The same tool architecture is available regardless of whether Luna or Terra is selected.

---

# Current Technology Stack

## AI & Agent Framework

- OpenAI API
- GPT-5.6 Luna
- GPT-5.6 Terra
- Selectable model layer
- Lightweight task-fit model recommendation
- LangChain
- LangGraph
- Tool-calling agent architecture

## Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- python-dotenv
- requests

## Authentication

- PyJWT
- HS256 JWT access tokens
- FastAPI HTTP Bearer authentication
- `pwdlib`
- Argon2 password hashing

## Frontend

- React
- Vite
- JavaScript
- React Markdown
- remark-gfm
- remark-math
- rehype-katex
- KaTeX

## Memory & Persistence

- PostgreSQL
- LangGraph PostgreSQL Checkpointer
- LangGraph persistent Store
- psycopg
- User-scoped conversation threads
- User-scoped long-term memory

## Projects

- Persistent project metadata
- User-owned project workspaces
- Secure ZIP codebase upload and extraction
- Persistent project files
- Project-specific chat sessions
- Targeted, scoped, and deep project retrieval
- Dynamic extension filtering for deep reviews
- Resumable batched whole-project review
- Exact `project_stats` file/line counting
- DOCX-aware project retrieval

## Retrieval-Augmented Generation

- Sentence Transformers
- Vector embeddings
- FAISS
- Query rewriting
- Exact-term retrieval
- CrossEncoder reranking
- Custom RAG pipeline

## External Tools

- OpenAI Web Search
- Frankfurter Currency API
- Custom Calculator Tool
- Custom RAG PDF Tool
- Custom Memory Tools
- Custom Project Search Tool
- Custom Project Statistics Tool
- Custom Code Sandbox Tool
- Custom Code File Generator

## Code Execution

- Docker
- Python 3.12 sandbox
- Node.js sandbox
- Java / Eclipse Temurin
- GCC / G++
- .NET SDK
- Go

## Containerization & Deployment

- Docker Compose
- Dockerized FastAPI backend
- React production build served through Nginx
- Nginx reverse proxy for `/api/*` requests
- Backend isolated from direct public host access
- PostgreSQL 18 Alpine container
- Persistent PostgreSQL Docker volume
- Persistent Hugging Face model cache
- Host-mounted upload and project storage
- Docker socket integration for isolated code sandbox containers
- AWS EC2 production deployment

---

# Current Project Structure

The project is divided into frontend, backend, authentication, persistence, projects, agent, RAG integration, containerization, and sandbox components.

```text
chatomni/
│
├── api.py
├── main.py
├── config.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env
├── .env.example
├── .gitignore
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .dockerignore
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       └── index.css
│
├── projects_data/
│
├── sandbox/
│   ├── python/
│   │   └── Dockerfile
│   │
│   ├── javascript/
│   │   └── Dockerfile
│   │
│   ├── java/
│   │   └── Dockerfile
│   │
│   ├── gcc/
│   │   └── Dockerfile
│   │
│   ├── csharp/
│   │   └── Dockerfile
│   │
│   └── go/
│       └── Dockerfile
│
├── src/
│   ├── agent.py
│   ├── auth.py
│   ├── tools.py
│   ├── code_sandbox.py
│   ├── checkpointer.py
│   ├── conversations.py
│   ├── projects.py
│   ├── project_files.py
│   ├── project_retrieval.py
│   ├── titles.py
│   ├── memory.py
│   ├── context.py
│   └── citations.py
│
└── uploads/
    ├── images/
    ├── code/
    └── generated/
```

The root `Dockerfile` builds the FastAPI backend image.

The frontend `Dockerfile` builds the React application and serves the production build through Nginx. `frontend/nginx.conf` also configures Nginx as a reverse proxy, forwarding `/api/*` requests to the FastAPI backend over the Docker network.

`docker-compose.yml` orchestrates the frontend, backend, and PostgreSQL services while keeping PostgreSQL data and Hugging Face model downloads persistent across container recreation.

The separately developed `rag_pdf_assistant` package is installed into the backend Docker image and imported through `RAGPipeline`.

---

# Direct Host Development

ChatOmni can also be run directly from VS Code without Docker during development.

In this mode:

- FastAPI runs on `http://127.0.0.1:8000`
- Vite runs on `http://localhost:5173`
- `frontend/vite.config.js` proxies `/api/*` requests to the local FastAPI server
- The Vite proxy removes the `/api` prefix so local development matches the production Nginx routing behavior

This keeps routes such as `/api/auth/login` and `/api/auth/register` working consistently in both local development and the deployed Docker/Nginx setup.

---

# Dockerized Local Application

ChatOmni runs as a complete multi-container Docker application locally and uses the same containerized architecture as the AWS EC2 deployment.

The Docker setup includes:

```text
Browser
   │
   ▼
React Production Build
   │
   ▼
Nginx
   │
   ▼
FastAPI
   │
   ├────────────── PostgreSQL
   │
   ├────────────── RAG / Hugging Face Cache
   │
   └────────────── Docker Code Sandbox
```

The main application services are orchestrated with Docker Compose:

```text
chatomni-frontend
chatomni-backend
chatomni-postgres
```

PostgreSQL uses a persistent Docker volume so conversation history and long-term memory survive container restarts.

Uploaded and generated files are mounted from the local `uploads/` directory.

The backend also mounts the Docker socket so the existing Code Sandbox can create short-lived isolated execution containers when code execution is requested.

Nginx is the single application entry point. It serves the React production build and forwards `/api/*` requests to the FastAPI service over the internal Docker network. The FastAPI container is therefore not exposed directly through a host port in the final Docker Compose configuration.

## Local Docker Requirements

To run the complete local version, the host machine needs:

- Docker Desktop or another compatible Docker Engine
- Docker Compose
- Git
- Internet access during the initial image build
- An OpenAI API key

A separate local PostgreSQL installation is not required when using Docker Compose.

## Environment Configuration

Copy:

```text
.env.example
```

to:

```text
.env
```

and provide the required values.

The current authenticated version also requires a `JWT_SECRET_KEY` for signing access tokens.

The Docker Compose setup uses `POSTGRES_PASSWORD` to initialize the PostgreSQL container.

When the application is started through Docker Compose, the backend receives an internal PostgreSQL connection string that points to the Docker service name:

```text
postgres
```

instead of `localhost`.

The existing host-based `POSTGRES_URI` can still be kept for running ChatOmni directly outside Docker.

## Build Code Sandbox Images

The Code Sandbox uses dedicated Docker images for each supported language.

Build them once from the project root:

```bash
docker build -t chatomni-python-sandbox ./sandbox/python
docker build -t chatomni-javascript-sandbox ./sandbox/javascript
docker build -t chatomni-java-sandbox ./sandbox/java
docker build -t chatomni-gcc-sandbox ./sandbox/gcc
docker build -t chatomni-csharp-sandbox ./sandbox/csharp
docker build -t chatomni-go-sandbox ./sandbox/go
```

These images are not long-running services.

They are used as templates for temporary containers created only when ChatOmni executes code.

## Start ChatOmni

From the project root:

```bash
docker compose up --build
```

After startup:

```text
Application:
http://localhost:5173

Health Check through Nginx:
http://localhost:5173/api/health
```

The backend is intentionally reached through Nginx rather than being exposed directly on `localhost:8000`.

The first build may take longer because backend dependencies and model-related components need to be downloaded.

The Hugging Face cache is stored in a persistent Docker volume so required model files do not need to be downloaded again after every container recreation.

## Stop ChatOmni

When running Docker Compose in the foreground, press:

```text
Ctrl + C
```

or run:

```bash
docker compose down
```

The PostgreSQL volume remains intact, so saved conversations and long-term memory remain available the next time the application starts.

To start the already-built application again:

```bash
docker compose up
```

> Removing Docker volumes, for example with `docker compose down -v`, also removes the Docker-managed PostgreSQL data. Use that command only when intentionally resetting the Docker database.

---

# Detailed Application Architecture

A simplified view of the current system:

```text
                           Browser
                              │
                              ▼
                         HTTP / Elastic IP
                              │
                              ▼
                           AWS EC2
                              │
                              ▼
                            Nginx
                       ┌──────┴──────┐
                       │             │
                       ▼             ▼
                 React Frontend    /api/*
                                     │
                                     ▼
                                   FastAPI
                                     │
                   ┌─────────────────┼─────────────────┐
                   │                 │                 │
                   ▼                 ▼                 ▼
                 Auth          ChatOmni Agent    Projects / Uploads
                   │                 │                 │
                   │          ┌──────┼──────┐          │
                   │          │      │      │          │
                   │          ▼      ▼      ▼          │
                   │         Web  Currency  RAG        │
                   │                 │                 │
                   │              Sandbox             │
                   │                 │                 │
                   └─────────────────┼─────────────────┘
                                     │
                              LangGraph Runtime
                                     │
                   ┌─────────────────┼─────────────────┐
                   │                 │                 │
                   ▼                 ▼                 ▼
                 Users          PostgreSQL       Docker Socket
                                     │                 │
                              ┌──────┼──────┐           ▼
                              │      │      │      Temporary Sandbox
                              ▼      ▼      ▼         Containers
                            Chats  Memory Projects
```

Authentication resolves every protected request to a unique user ID.

That user ID is then used for conversation isolation, long-term memory context, project ownership, and user-specific application state.

Model selection remains part of the React interface.

Each request can use either:

```text
GPT-5.6 Luna
      or
GPT-5.6 Terra
```

while sharing the authenticated user's persistent conversation state, memory system, tools, and backend infrastructure.

---

# Example Usage

## General Conversation

```text
Model:
GPT-5.6 Luna

User:
Explain how neural networks work.

ChatOmni:
...
```

## Complex Task

```text
Model:
GPT-5.6 Terra

User:
Review this backend architecture,
identify possible concurrency issues,
and propose a safer design.

ChatOmni:
...
```

## Model Recommendation

```text
Model:
GPT-5.6 Luna

User:
Analyze this large codebase and propose
an architectural refactoring strategy.

ChatOmni:
...

Tip:
This task may benefit from GPT-5.6 Terra.

[Switch to Terra]
```

## Mathematical Question

```text
User:
What is 145 × 27?

ChatOmni:
...
```

## Currency Conversion

```text
User:
How much is 500 EUR in TRY?

ChatOmni:
...
```

## Current Information

```text
User:
What happened in AI news today?

ChatOmni:
...
```

## PDF Question

```text
[Upload document.pdf]

User:
Summarize the main points of this document.

ChatOmni:
...
```

## Screenshot Analysis

```text
[Paste screenshot]

User:
Why am I getting this error?

ChatOmni:
...
```

## Code File Analysis

```text
[Upload main.cpp]

User:
Explain what this program does.

ChatOmni:
...
```

## Code Execution

```text
User:
Run this Python code and tell me the result.

print(sum(range(1, 101)))
```

## Downloadable Code Generation

```text
User:
Write a simple Python example and give it to me as hello.py.

ChatOmni:
hello.py has been created.

CODE   hello.py   Download
```

---

# AWS EC2 Deployment

ChatOmni is deployed on **AWS EC2** using the same Docker Compose architecture verified locally.

The public deployment is exposed through the Elastic IP **`63.183.71.155`**, with Nginx acting as the single entry point for both the React frontend and `/api/*` traffic.

The production deployment keeps the application modular:

```text
GitHub Repository
       │
       ▼
     AWS EC2
       │
       ▼
Docker Compose
       │
       ├── chatomni-frontend
       │      └── Nginx + React
       │
       ├── chatomni-backend
       │      └── FastAPI + ChatOmni Agent
       │
       └── chatomni-postgres
              └── Persistent PostgreSQL Data
```

Nginx acts as the public application gateway:

```text
User
  │
  ▼
HTTP / Elastic IP
  │
  ▼
Nginx
  │
  ├── /        → React frontend
  │
  └── /api/*   → FastAPI backend
```

The backend is not exposed directly as a separate public `:8000` service. Browser requests use the same origin and API traffic is forwarded internally through Nginx.

Production configuration is provided through environment variables rather than being committed to the repository. Sensitive values include:

```text
OPENAI_API_KEY
POSTGRES_PASSWORD
JWT_SECRET_KEY
```

Persistent PostgreSQL data is stored outside the lifecycle of individual application containers, and `uploads/` and `projects_data/` are mounted so user-created application data survives container recreation.

## Live Deployment

- **Public Endpoint:** [http://63.183.71.155](http://63.183.71.155)
- **Elastic IP:** `63.183.71.155`

The AWS EC2 instance uses an Elastic IP so the public address remains stable across instance stop/start cycles.

The public endpoint currently uses HTTP. Because this deployment is intended for short-term portfolio review and evaluation, a dedicated domain and TLS certificate are not currently configured. Visitors should use temporary test credentials rather than real or reused passwords.

To control cloud infrastructure costs, the EC2 instance may be stopped when it is not actively being reviewed. If the application is offline when you would like to evaluate it, please contact me by email and I can start the instance.

---

# Long-Term Goal

The long-term goal of ChatOmni is to combine multiple AI capabilities into a single modular assistant:

```text
Authenticated Multi-User Access
        +
General Conversation
        +
Selectable AI Models
        +
Current Web Information
        +
Mathematics
        +
Currency Data
        +
Document RAG
        +
Persistent Conversations
        +
Long-Term Memory
        +
Persistent Projects
        +
Image Understanding
        +
Programming Assistance
        +
Code Execution
        +
File Generation
        ↓
      ChatOmni
```

Instead of implementing every capability directly inside the language-model workflow, specialized functionality is exposed through independent tools and persistence layers.

This makes the system easier to:

- Test
- Maintain
- Isolate by user
- Replace individual components
- Operate as a modular application

The architecture keeps the agent, tools, memory, projects, authentication, and execution sandbox separated so the application remains maintainable as a complete system.

---

# Project Status

**Core Feature Complete — Dockerized and Deployed on AWS EC2**

ChatOmni's planned core application features are implemented. The system runs as a multi-user, persistent, containerized AI application with React, FastAPI, PostgreSQL, Nginx, Docker Compose, isolated code-execution sandboxes, persistent project workspaces, exact project statistics, and AWS EC2 deployment.

Large whole-project reviews are now safe and resumable rather than being forced through a single long-running request. Very large codebases may still require several continuation turns because deep review remains chunk/batch based; reducing the number of batches without losing review coverage is the main remaining optimization target.

The current public deployment is intentionally operated on demand rather than 24/7 to control cloud infrastructure costs.

---

# Related Project

ChatOmni integrates the independently developed **RAG PDF Assistant**.

The RAG project provides:

- PDF processing
- Semantic retrieval
- Exact-term retrieval
- Query rewriting
- CrossEncoder reranking
- LLM-based answer generation

The integration demonstrates how a standalone AI application can be refactored into a reusable Python package and incorporated into a larger agent-based system.

---

# License

This project is currently intended for educational, experimental, and portfolio purposes.

A formal open-source license may be added as the project approaches a stable release.

---

# Author

**Eray Genç**