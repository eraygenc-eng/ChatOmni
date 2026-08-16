# ChatOmni

**ChatOmni** is a general-purpose AI assistant built with Python, LangChain, and OpenAI models.

The goal of the project is to build a modular conversational assistant capable of combining general AI reasoning with external tools such as web search, mathematical calculations, currency conversion, and document-based Retrieval-Augmented Generation (RAG).

Unlike a traditional question-answering chatbot, ChatOmni is designed as a **tool-using AI agent** that can decide which capability is required for a user's request and use the appropriate tool automatically.

The project is currently under active development.

---

## Current Features

### Conversational AI

ChatOmni can handle general-purpose conversations and questions using an OpenAI language model through LangChain.

The assistant can:

* Answer general questions
* Explain technical and non-technical topics
* Follow conversational instructions
* Respond naturally in both **English and Turkish**
* Automatically adapt to the language used by the user

The current model configuration uses **GPT-5.6 Terra** through the OpenAI API.

---

### LangChain Agent Architecture

ChatOmni uses a LangChain agent instead of manually routing every request.

The agent analyzes the user's message and decides whether it should:

* Answer directly with the language model
* Use the calculator
* Search the web
* Convert currencies
* Search the currently loaded PDF document
* Save or retrieve persistent user memory when appropriate

This architecture allows new capabilities to be added as independent tools without redesigning the entire application.

Conceptually:

```text
User
  │
  ▼
ChatOmni Agent
  │
  ├── Direct LLM Response
  │
  ├── Calculator Tool
  │
  ├── Currency Tool
  │
  ├── Web Search Tool
  │
  ├── RAG PDF Tool
  │
  └── Memory Tools
          │
          ▼
      PostgreSQL
```

---

## Real-Time Web Search

ChatOmni can access current information using a web search tool.

This allows the assistant to answer questions that cannot reliably be answered using only the language model's internal knowledge.

Example questions:

```text
What is the latest Bitcoin price?

What happened in AI news today?

Who currently holds a specific public position?
```

When web search is used, ChatOmni can also display the sources used for the answer.

---

## Mathematical Calculations

ChatOmni includes a dedicated calculator tool for reliable arithmetic operations.

Currently supported operations include:

* Addition
* Subtraction
* Multiplication
* Division

Example:

```text
What is 256 × 73?
```

Instead of relying entirely on the language model to perform the calculation, the agent can call the calculator tool and use its result when generating the final response.

---

## Currency Conversion

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

and calls the currency conversion tool when necessary.

Frankfurter provides reference exchange rates from official financial data sources without requiring an API key.

> Note: These rates are reference exchange rates and may differ slightly from live trading or financial-market prices.

---

## RAG PDF Assistant Integration

One of the main features of ChatOmni is the integration of my previous **RAG PDF Assistant** project.

The original RAG application was refactored into a reusable Python package:

```text
rag_pdf_assistant
```

ChatOmni imports the RAG system through:

```python
from rag_pdf_assistant import RAGPipeline
```
> **Note:** The RAG functionality is provided by my separately developed `rag_pdf_assistant` project.  
> ChatOmni imports this package through `RAGPipeline`, so the package must be installed in the active Python environment before PDF-related features can be used.

The RAG pipeline is exposed to the LangChain agent as a dedicated:

```text
rag_pdf
```

tool.

This means the agent can automatically recognize when a question refers to a loaded PDF and route the request to the RAG system.

---

## Dynamic PDF Selection

PDF documents can be selected dynamically without restarting or modifying the application.

Example:

```text
/pdf "C:\Documents\example.pdf"
```

After the PDF is selected, questions can be asked naturally:

```text
According to the document, how will the revenue be distributed?
```

When a new PDF is selected, the previous RAG pipeline is reset and a new pipeline is initialized when required.

---

## RAG Retrieval Pipeline

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

The retrieval system combines multiple search strategies instead of relying on a single vector search.

This improves retrieval quality for:

* Direct questions
* Complex questions
* Abbreviations
* Exact terminology
* Questions where semantic similarity alone is insufficient

The same retrieval pipeline used by the standalone RAG application is now used inside ChatOmni.

---

## True Response Streaming

ChatOmni supports **real token streaming**.

Responses are displayed while the language model is generating them instead of waiting for the entire answer to be completed first.

```text
Without streaming:

User
  ↓
Model generates complete response
  ↓
User waits
  ↓
Full response appears


With ChatOmni streaming:

User
  ↓
Model starts generating
  ↓
First tokens appear immediately
  ↓
More tokens continue appearing
  ↓
Response completes
```

This is genuine model streaming rather than a typing animation applied after the answer has already been generated.

Streaming also works after tool calls such as:

* Web search
* Currency conversion
* RAG retrieval

The tool completes its required operation first, and the final language-model response begins streaming as soon as generation starts.

---
## Conversation and Long-Term Memory

ChatOmni now includes both **short-term conversation memory** and **persistent long-term user memory**.

Short-term conversation context is handled with LangGraph's `InMemorySaver`, allowing the assistant to understand references to earlier messages within the active conversation.

Long-term memory is backed by **PostgreSQL** through a persistent LangGraph store. This allows important user information to remain available even after ChatOmni is closed and started again.

The assistant can:

* Remember information when the user explicitly asks it to save or not forget something
* Automatically save stable profile information that is likely to be useful in future conversations
* Retrieve previously saved information when it becomes relevant
* Keep temporary or one-time details out of long-term memory unless the user explicitly asks to save them

Examples of profile information that can be saved automatically include:

* Full name or preferred name
* University, degree, or academic program
* Current job, workplace, or professional role
* Main field of study or specialization
* Long-term academic or career goals
* Important ongoing projects

This persistent profile memory is separate from the planned persistent conversation-history system, which will later manage multiple saved chat sessions.
---

## Multi-Tool Agent Behavior

Because ChatOmni is built around an agent architecture, it can use tools as part of a multi-step reasoning process.

For example:

```text
Convert 100 USD and 200 EUR to TRY and calculate the total.
```

A request like this may require multiple operations:

```text
USD → TRY conversion
       +
EUR → TRY conversion
       +
Mathematical calculation
       ↓
Final Answer
```

This architecture allows ChatOmni to become progressively more capable as additional tools are introduced.

---

# Current Technology Stack

### AI & Agent Framework

* OpenAI API
* GPT-5.6 Terra
* LangChain
* LangGraph-based agent execution

### Retrieval-Augmented Generation

* Sentence Transformers
* Vector embeddings
* FAISS
* Query rewriting
* Exact-term retrieval
* CrossEncoder reranking
* Custom RAG pipeline

### External Tools

* OpenAI Web Search
* Frankfurter Currency API
* Custom Calculator Tool
* Custom RAG PDF Tool
* Custom Memory Tools

### Memory & Persistence

* LangGraph `InMemorySaver`
* LangGraph persistent store
* PostgreSQL
* psycopg

### Core

* Python
* python-dotenv
* requests

---

# Current Project Structure

The project follows a modular structure where agent logic, tools, and supporting systems are separated.

```text
chatomni/
│
├── main.py
│
├── .env
├── .gitignore
├── requirements.txt
│
└── src/
    ├── agent.py
    ├── tools.py
    ├── citations.py
    ├── context.py
    └── memory.py
```

The reusable RAG system is maintained as a separate Python package and integrated into ChatOmni through `RAGPipeline`.

This separation keeps the RAG system reusable while allowing ChatOmni to use it as one of many available tools.

---

# Example Usage

Start ChatOmni:

```bash
python main.py
```

The terminal interface starts with:

```text
ChatOmni is ready. Type 'exit' to stop.
```

### General Conversation

```text
You: Explain how neural networks work.

ChatOmni: ...
```

### Mathematical Question

```text
You: What is 145 × 27?

ChatOmni: ...
```

### Currency Conversion

```text
You: How much is 500 EUR in TRY?

ChatOmni: ...
```

### Current Information

```text
You: What happened in AI news today?

ChatOmni: ...
```

### Load a PDF

```text
You: /pdf "C:\Documents\example.pdf"

ChatOmni: PDF loaded: C:\Documents\example.pdf
```

Then ask:

```text
You: According to the document, what is the proposed revenue distribution?

ChatOmni: ...
```

---

# Development Roadmap

ChatOmni is being developed incrementally.

The next stages focus on turning the current tool-using agent into a complete conversational AI application.


---

## 1. Automatic Chat Titles

ChatOmni will automatically generate short titles based on the beginning of a conversation.

Examples:

```text
RAG Architecture Discussion

Python Debugging Help

Denmark Salary Calculation

Machine Learning Study
```

These titles will later be used in the graphical chat interface.

---

## 2. Image and Screenshot Understanding

ChatOmni will gain multimodal input support.

Users will be able to upload:

* Screenshots
* Error messages
* Charts
* Diagrams
* Application interfaces
* General images

Example:

```text
[Upload screenshot]

Why am I getting this Python error?
```

ChatOmni will analyze the image and use its contents as part of the conversation.

This feature focuses on **image understanding**, not image generation.

---

## 3. Improved Citation System

The citation architecture will be expanded so different tools can clearly expose their information sources.

Planned citation types include:

```text
Web Search
→ Website URLs

RAG
→ PDF pages / document references

Currency
→ Exchange-rate provider
```

The goal is to make externally retrieved information easier to verify.

---

## 4. Python Coding and Debugging

ChatOmni will include stronger programming-oriented capabilities.

Planned features include:

* Generate Python code
* Explain existing code
* Analyze tracebacks
* Detect bugs
* Suggest fixes
* Refactor code
* Explain programming concepts

Secure Python execution may later be introduced as a separate sandboxed tool.

---

## 5. Graphical Chat Interface

The current terminal application will eventually be replaced or complemented by a modern chat interface.

Planned UI features include:

```text
┌──────────────────────────────────────────┐
│ ChatOmni                                 │
├───────────────┬──────────────────────────┤
│ Conversations │ Chat                     │
│               │                          │
│ Chat 1        │ User messages            │
│ Chat 2        │                          │
│ Chat 3        │ ChatOmni responses       │
│               │                          │
│               │ PDF / Image Upload       │
└───────────────┴──────────────────────────┘
```

The interface is planned to support:

* Streaming responses
* Conversation history
* Multiple chats
* Automatic chat titles
* PDF uploads
* Image uploads
* Source display
* Markdown rendering
* Code blocks

---

## 6. Production Deployment

After the main application features are complete, the project will move toward production deployment.

Planned work includes:

* Docker containerization
* Environment-based configuration
* Secret management
* Error handling
* Logging
* Dependency cleanup
* Deployment configuration
* AWS deployment

The final objective is to make ChatOmni accessible as a deployed web application rather than only as a local terminal program.

---

# Long-Term Goal

The long-term goal of ChatOmni is to combine multiple AI capabilities into a single modular assistant:

```text
General Conversation
        +
Current Web Information
        +
Mathematics
        +
Currency Data
        +
Document RAG
        +
Conversation Memory
        +
Image Understanding
        +
Programming Assistance
        ↓
      ChatOmni
```

Instead of implementing every capability directly inside the language model workflow, specialized functionality is exposed through independent tools.

This makes the system easier to extend, test, and maintain.

Future capabilities can be introduced by adding new tools to the agent architecture without rebuilding the entire assistant.

---

# Project Status

**Active Development**

Currently implemented:

* [x] OpenAI LLM integration
* [x] LangChain agent architecture
* [x] Turkish and English interaction
* [x] General conversational responses
* [x] Calculator tool
* [x] Real-time web search
* [x] Web source extraction
* [x] Currency conversion tool
* [x] RAG PDF Assistant integration
* [x] Dynamic PDF selection
* [x] Multi-stage RAG retrieval
* [x] CrossEncoder reranking
* [x] Multi-tool agent behavior
* [x] True response streaming
* [x] Conversation memory
* [x] Persistent conversation history

Planned:

* [ ] Multiple chat sessions
* [ ] Automatic chat titles
* [ ] Image and screenshot understanding
* [ ] Extended citation system
* [ ] Advanced Python coding and debugging support
* [ ] Secure Python execution
* [ ] Graphical chat interface
* [ ] Docker production setup
* [ ] AWS deployment

---

## Related Project

ChatOmni integrates the independently developed **RAG PDF Assistant**, which provides document retrieval, semantic search, exact-term retrieval, query rewriting, CrossEncoder reranking, and LLM-based answer generation.

The integration demonstrates how a standalone AI application can be refactored into a reusable Python package and incorporated into a larger agent-based system.

---

## License

This project is intended for educational, experimental, and portfolio purposes.

A formal open-source license may be added as the project approaches a stable release.

---

## Author

**Eray Genç**