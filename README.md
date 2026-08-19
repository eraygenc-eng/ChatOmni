# ChatOmni

**ChatOmni** is a modular general-purpose AI assistant built with Python, LangChain, LangGraph, FastAPI, React, PostgreSQL, Docker, and OpenAI models.

The goal of the project is to build a conversational AI assistant that combines general-purpose reasoning with specialized tools such as:

- Real-time web search
- Mathematical calculations
- Currency conversion
- Retrieval-Augmented Generation (RAG)
- Persistent conversation and user memory
- Image and screenshot understanding
- Multi-language code execution
- Code and text file analysis
- Downloadable code generation
- Selectable AI models for different task complexity levels

Unlike a traditional question-answering chatbot, ChatOmni is designed as a **tool-using AI agent**.

The language model can decide when a request should be answered directly and when an external tool should be used.

ChatOmni is currently under active development.

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

This classification is performed locally using a lightweight heuristic and does **not require an additional language-model request**.

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

The citation system will continue to be improved in future versions.

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

The package must be installed in the active Python environment before RAG functionality can be used.

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

Each chat receives its own unique `chat_id`, which is used as the LangGraph:

```text
thread_id
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

---

# Multi-Chat React Interface

ChatOmni now includes a graphical chat interface built with **React + Vite**.

The interface includes:

- Persistent conversation sidebar
- New Chat button
- Automatic chat titles
- Reopening saved chats
- Chat deletion
- Dark and light themes
- Collapsible sidebar
- Streaming assistant responses
- Thinking indicator
- Stop-generation button
- File attachments
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
┌─────────────────────────────────────────────────────┐
│ ChatOmni                                      Theme │
├─────────────────┬───────────────────────────────────┤
│ New Chat        │                                   │
│                 │          Conversation             │
│ Chat 1          │                                   │
│ Chat 2          │       User / Assistant            │
│ Chat 3          │                                   │
│                 │                                   │
│                 │   PDF / Image / Code Upload       │
│                 │   Model: Luna ▼                   │
└─────────────────┴───────────────────────────────────┘
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

# Code and Text File Upload

ChatOmni can directly receive source-code and text files through the chat interface.

Currently supported extensions include:

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

Uploaded files are treated as text and passed to the assistant for analysis.

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

> Docker-based sandboxing is useful isolation for the current local and portfolio-oriented version of ChatOmni, but Docker containers should not be treated as a perfect security boundary for a public arbitrary-code execution service. Additional production hardening is planned.

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

---

# Current Project Structure

The project is divided into frontend, backend, persistence, agent, RAG integration, and sandbox components.

```text
chatomni/
│
├── api.py
├── main.py
├── config.py
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
│
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       └── index.css
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
│   ├── tools.py
│   ├── code_sandbox.py
│   ├── checkpointer.py
│   ├── conversations.py
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

The separately developed `rag_pdf_assistant` package is installed into the same Python environment and imported through `RAGPipeline`.

---

# Application Architecture

A simplified view of the current system:

```text
                         Browser
                            │
                            ▼
                    React + Vite UI
                            │
                     Model Selector
                            │
               ┌────────────┴────────────┐
               │                         │
               ▼                         ▼
         GPT-5.6 Luna              GPT-5.6 Terra
               │                         │
               └────────────┬────────────┘
                            │
                            ▼
                         FastAPI
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
       ChatOmni Agent                 Upload APIs
              │                           │
   ┌──────────┼──────────┐        ┌───────┼─────────┐
   │          │          │        │       │         │
   ▼          ▼          ▼        ▼       ▼         ▼
 Web       Currency     RAG      PDF     Image     Code
   │          │          │
   └──────────┼──────────┘
              │
              ▼
        LangGraph Runtime
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
 PostgreSQL      Code Sandbox
                       │
                       ▼
                    Docker
```

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

# Development Roadmap

The major conversational and tool-using capabilities of ChatOmni are now implemented.

The remaining work primarily focuses on local distribution, multi-user architecture, source transparency, production hardening, deployment, and final polish.

---

## 1. Full Docker Application Setup

The Code Sandbox already uses Docker, but the complete ChatOmni application still requires containerization.

The planned local Docker architecture includes:

```text
Frontend
    +
FastAPI
    +
PostgreSQL
    +
ChatOmni Agent
    +
Code Sandbox
```

The goal is to allow a user to clone ChatOmni and start the complete application without installing PostgreSQL or manually configuring each application component.

A persistent Docker volume will be used for PostgreSQL data so conversation history and long-term memory survive container restarts.

---

## 2. Multi-User Authentication and Data Isolation

The current local version is designed primarily as a single-user application.

Before exposing the application as a shared public deployment, ChatOmni will receive a minimal multi-user authentication layer.

The planned architecture includes:

```text
Register
   +
Login
   +
Logout
   ↓
Authenticated User
   ↓
Unique User ID
   ↓
Per-user data isolation
```

User-owned resources will be isolated, including:

```text
Conversation History
Long-Term Memory
Uploaded Files
RAG State
Generated Files
```

The goal is to preserve the simple local experience while making the deployed version safe for multiple independent users.

---

## 3. Generated File Persistence

Generated download cards currently belong to the active frontend response.

A future update will persist generated-file metadata together with conversation history so that reopening an older conversation can restore:

```text
CODE   example.py   Download
```

without requiring the file to be generated again.

---

## 4. Improved Citation System

The citation architecture will be expanded so different tools can expose their sources consistently.

Planned citation types include:

```text
Web Search
→ Website URLs

RAG
→ PDF pages / document references

Currency
→ Exchange-rate provider
```

The goal is to make externally retrieved information easier to verify directly from the interface.

---

## 5. Code Sandbox Hardening

The current Docker sandbox provides multiple isolation layers, but further work is planned before treating arbitrary-code execution as a production service.

Planned improvements include:

- Network-isolation verification tests
- Filesystem-isolation tests
- Timeout cleanup tests
- Stronger output limits while processes are running
- Better protection against excessive stdout/stderr
- Sandbox-worker separation from the main API
- Evaluation of stronger isolation technologies for public deployment

Possible future approaches include:

```text
gVisor
Kata Containers
MicroVM-based isolation
Remote sandbox workers
```

---

## 6. Production Hardening

Before public deployment, the application will receive additional production-oriented improvements.

Planned work includes:

- Structured logging
- Stronger error handling
- Environment-based configuration
- Secret management
- Dependency cleanup
- Upload cleanup policies
- Generated-file cleanup policies
- Request limits
- Basic rate limiting
- Production configuration

---

## 7. AWS Deployment

After multi-user isolation and production hardening, ChatOmni will be deployed on AWS.

Deployment work will include:

- Backend deployment
- Frontend deployment
- PostgreSQL persistence
- Docker runtime configuration
- Sandbox execution strategy
- Environment-variable configuration
- Cost optimization
- Start/stop deployment workflow

The goal is to make ChatOmni accessible as a deployed web application while keeping infrastructure costs manageable.

---

## 8. Optional UI Improvements

The current interface already supports the main required functionality.

Possible future polish includes:

- Manual chat renaming
- Chat search
- Custom delete-confirmation modal
- Better loading states
- Better error messages
- Improved generated-file cards
- Additional responsive UI improvements

These are considered secondary improvements rather than core missing functionality.

---

# Long-Term Goal

The long-term goal of ChatOmni is to combine multiple AI capabilities into a single modular assistant:

```text
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

Instead of implementing every capability directly inside the language-model workflow, specialized functionality is exposed through independent tools.

This makes the system easier to:

- Extend
- Test
- Maintain
- Replace components
- Add future capabilities

The architecture is intentionally modular so future tools can be added without rebuilding the whole assistant.

---

# Project Status

**Active Development**

## Implemented

- [x] OpenAI LLM integration
- [x] GPT-5.6 Luna support
- [x] GPT-5.6 Terra support
- [x] Manual Luna / Terra model selection
- [x] Luna as the default model
- [x] Per-request backend model selection
- [x] Cached agent configurations for Luna and Terra
- [x] Local task-complexity classification
- [x] Task-fit model recommendation hints
- [x] One-click model switching from recommendation hints
- [x] Model switching without losing conversation continuity
- [x] LangChain agent architecture
- [x] LangGraph integration
- [x] Turkish and English interaction
- [x] General conversational responses
- [x] Calculator tool
- [x] Real-time web search
- [x] Web source extraction
- [x] Currency conversion tool
- [x] RAG PDF Assistant integration
- [x] Dynamic PDF loading
- [x] PDF upload from React
- [x] Multi-stage RAG retrieval
- [x] Query rewriting
- [x] Exact-term retrieval
- [x] CrossEncoder reranking
- [x] Multi-tool agent behavior
- [x] True response streaming
- [x] Stop-generation control
- [x] Persistent conversation state
- [x] PostgreSQL-backed LangGraph checkpointer
- [x] Persistent long-term memory
- [x] Multiple chat sessions
- [x] Reopening previous conversations
- [x] Chat deletion
- [x] Automatic chat titles
- [x] React graphical chat interface
- [x] Dark and light themes
- [x] Collapsible sidebar
- [x] Markdown rendering
- [x] LaTeX rendering
- [x] Tool-use indicators
- [x] Image upload
- [x] Screenshot paste support
- [x] Image and screenshot understanding
- [x] Code block rendering
- [x] Code block copy button
- [x] Code and text file uploads
- [x] Python code execution
- [x] JavaScript code execution
- [x] Java code execution
- [x] C code execution
- [x] C++ code execution
- [x] C# code execution
- [x] Go code execution
- [x] Docker sandbox isolation
- [x] Execution timeouts
- [x] Code file generation
- [x] Generated source-code downloads
- [x] Save-As file selection in supported browsers

## Planned

- [ ] Full local Docker application setup
- [ ] PostgreSQL Docker container
- [ ] Persistent PostgreSQL Docker volume
- [ ] Simple Docker-based local distribution
- [ ] Multi-user authentication
- [ ] Per-user conversation isolation
- [ ] Per-user long-term memory isolation
- [ ] Per-user upload and RAG isolation
- [ ] Generated-file cards restored when old chats are reopened
- [ ] Improved citation UI
- [ ] Additional Code Sandbox hardening
- [ ] Production logging and error handling
- [ ] Upload/generated-file cleanup policies
- [ ] Rate limiting
- [ ] AWS deployment
- [ ] Final UI polish
- [ ] Final README screenshots and documentation cleanup

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