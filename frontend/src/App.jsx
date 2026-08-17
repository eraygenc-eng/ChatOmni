import { Children, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'


const TOOL_MARKER = '[[CHATOMNI_TOOL_ICONS]]'


function getToolIcon(toolName) {
  switch (toolName) {
    case 'Memory':
      return '🧠'

    case 'Web':
      return '🌐'

    case 'Calculator':
      return '∑'

    case 'Currency':
      return '⇄'

    case 'RAG':
      return '📄'

    default:
      return '◆'
  }
}


function ToolIcons({ tools }) {
  if (!tools || tools.length === 0) {
    return null
  }

  return (
    <span
      className="tool-icon-group"
      aria-label={`Used tools: ${tools.join(', ')}`}
    >
      {tools.map((tool) => (
        <span
          key={tool}
          className="tool-icon"
          title={tool}
        >
          {getToolIcon(tool)}
        </span>
      ))}
    </span>
  )
}


function replaceToolMarker(children, tools) {
  return Children.map(children, (child, index) => {
    if (
      typeof child === 'string' &&
      child.includes(TOOL_MARKER)
    ) {
      const parts = child.split(TOOL_MARKER)

      return (
        <span key={`tool-marker-${index}`}>
          {parts[0]}

          <ToolIcons tools={tools} />

          {parts.slice(1).join(TOOL_MARKER)}
        </span>
      )
    }

    return child
  })
}


function MarkdownAnswer({
  text,
  tools,
  showToolIcons,
}) {
  const hasTools =
    showToolIcons &&
    tools &&
    tools.length > 0

  let markdownText = text

  if (hasTools) {
    const trimmedText =
      text.trimEnd()

    /*
      Normal bir cevap paragrafla bitiyorsa
      tool marker aynı satırın sonuna eklenir.

      Cevap code block ile bitiyorsa Markdown'ı
      bozmamak için marker yeni paragrafa alınır.
    */
    if (
      trimmedText.endsWith('```')
    ) {
      markdownText =
        `${trimmedText}\n\n${TOOL_MARKER}`
    } else {
      markdownText =
        `${trimmedText} ${TOOL_MARKER}`
    }
  }


  const components = {
    p: ({ children }) => (
      <p>
        {replaceToolMarker(
          children,
          tools
        )}
      </p>
    ),

    h1: ({ children }) => (
      <h1>
        {replaceToolMarker(
          children,
          tools
        )}
      </h1>
    ),

    h2: ({ children }) => (
      <h2>
        {replaceToolMarker(
          children,
          tools
        )}
      </h2>
    ),

    h3: ({ children }) => (
      <h3>
        {replaceToolMarker(
          children,
          tools
        )}
      </h3>
    ),

    h4: ({ children }) => (
      <h4>
        {replaceToolMarker(
          children,
          tools
        )}
      </h4>
    ),

    h5: ({ children }) => (
      <h5>
        {replaceToolMarker(
          children,
          tools
        )}
      </h5>
    ),

    h6: ({ children }) => (
      <h6>
        {replaceToolMarker(
          children,
          tools
        )}
      </h6>
    ),

    li: ({ children }) => (
      <li>
        {replaceToolMarker(
          children,
          tools
        )}
      </li>
    ),
  }


  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {markdownText}
    </ReactMarkdown>
  )
}


function App() {
  const [input, setInput] =
    useState('')

  const [messages, setMessages] =
    useState([])

  const [theme, setTheme] =
    useState('dark')

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(true)

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null)

  const [
    attachMenuOpen,
    setAttachMenuOpen,
  ] = useState(false)

  const [
    activeChat,
    setActiveChat,
  ] = useState(
    'ChatOmni Development'
  )

  const [
    isStreaming,
    setIsStreaming,
  ] = useState(false)


  const pdfInputRef =
    useRef(null)

  const imageInputRef =
    useRef(null)

  const attachAreaRef =
    useRef(null)

  const messageInputRef =
    useRef(null)

  const messagesContainerRef =
    useRef(null)

  const abortControllerRef =
    useRef(null)


  // ========================================
  // CLOSE ATTACHMENT MENU
  // ========================================

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        attachMenuOpen &&
        attachAreaRef.current &&
        !attachAreaRef.current.contains(
          event.target
        )
      ) {
        setAttachMenuOpen(false)
      }
    }


    document.addEventListener(
      'mousedown',
      handleClickOutside
    )


    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [attachMenuOpen])


  // ========================================
  // KEEP INPUT FOCUSED
  // ========================================

  useEffect(() => {
    requestAnimationFrame(() => {
      messageInputRef.current?.focus()
    })
  }, [messages.length])


  // ========================================
  // AUTO-GROW TEXTAREA
  // ========================================

  useEffect(() => {
    const textarea =
      messageInputRef.current


    if (!textarea) {
      return
    }


    textarea.style.height = 'auto'


    const newHeight =
      Math.min(
        Math.max(
          textarea.scrollHeight,
          52
        ),
        160
      )


    textarea.style.height =
      `${newHeight}px`
  }, [input, messages.length])


  // ========================================
  // AUTO-SCROLL CHAT
  // ========================================

  useEffect(() => {
    const container =
      messagesContainerRef.current


    if (!container) {
      return
    }


    requestAnimationFrame(() => {
      container.scrollTop =
        container.scrollHeight
    })
  }, [messages])


  // ========================================
  // STOP GENERATION
  // ========================================

  function stopGeneration() {
    if (
      abortControllerRef.current
    ) {
      abortControllerRef.current.abort()
    }
  }


  // ========================================
  // TOOL EVENT
  // ========================================

  function addToolToMessage(
    assistantMessageId,
    toolName
  ) {
    if (!toolName) {
      return
    }


    setMessages(
      (currentMessages) =>
        currentMessages.map(
          (message) => {
            if (
              message.id !==
              assistantMessageId
            ) {
              return message
            }


            if (
              message.tools.includes(
                toolName
              )
            ) {
              return message
            }


            return {
              ...message,

              tools: [
                ...message.tools,
                toolName,
              ],
            }
          }
        )
    )
  }


  // ========================================
  // TOKEN EVENT
  // ========================================

  function addTokenToMessage(
    assistantMessageId,
    token
  ) {
    if (!token) {
      return
    }


    setMessages(
      (currentMessages) =>
        currentMessages.map(
          (message) =>
            message.id ===
            assistantMessageId
              ? {
                  ...message,

                  isThinking: false,

                  text:
                    message.text +
                    token,
                }
              : message
        )
    )
  }


  // ========================================
  // RESPONSE COMPLETE
  // ========================================

  function finishAssistantMessage(
    assistantMessageId
  ) {
    setMessages(
      (currentMessages) =>
        currentMessages.map(
          (message) =>
            message.id ===
            assistantMessageId
              ? {
                  ...message,

                  isThinking: false,

                  isComplete: true,
                }
              : message
        )
    )
  }


  // ========================================
  // PROCESS STREAM EVENT
  // ========================================

  function processStreamEvent(
    event,
    assistantMessageId
  ) {
    if (
      !event ||
      !event.type
    ) {
      return
    }


    if (
      event.type === 'tool'
    ) {
      addToolToMessage(
        assistantMessageId,
        event.name
      )

      return
    }


    if (
      event.type === 'token'
    ) {
      addTokenToMessage(
        assistantMessageId,
        event.content
      )

      return
    }


    if (
      event.type === 'done'
    ) {
      finishAssistantMessage(
        assistantMessageId
      )
    }
  }


  // ========================================
  // SEND MESSAGE
  // ========================================

  async function sendMessage() {
    const typedMessage =
      input.trim()


    if (isStreaming) {
      return
    }


    if (
      typedMessage === '' &&
      !selectedFile
    ) {
      return
    }


    if (
      selectedFile &&
      selectedFile.category === 'image'
    ) {
      alert(
        'Image upload is not connected to the backend yet.'
      )

      return
    }


    const attachment =
      selectedFile


    const messageText =
      typedMessage ||
      (
        attachment?.category === 'pdf'
          ? 'Bu PDF’i kısaca özetle.'
          : ''
      )


    const backendMessage =
      attachment?.category === 'pdf'
        ? (
            `[A PDF named "${attachment.name}" has just been uploaded ` +
            `and loaded as the active PDF document. ` +
            `The user's message refers to this PDF.] ${messageText}`
          )
        : messageText


    const userMessageId =
      Date.now()


    const assistantMessageId =
      userMessageId + 1


    const userMessage = {
      id: userMessageId,

      text: messageText,

      sender: 'user',

      file: attachment
        ? {
            name: attachment.name,
            type: attachment.type,
            category:
              attachment.category,
          }
        : null,
    }


    const assistantMessage = {
      id: assistantMessageId,

      text: '',

      sender: 'assistant',

      tools: [],

      isThinking: true,

      isComplete: false,
    }


    setMessages(
      (currentMessages) => [
        ...currentMessages,
        userMessage,
        assistantMessage,
      ]
    )


    setInput('')

    setSelectedFile(null)

    setAttachMenuOpen(false)

    setIsStreaming(true)


    const controller =
      new AbortController()


    abortControllerRef.current =
      controller


    try {

      // ========================================
      // UPLOAD PDF FIRST
      // ========================================

      if (
        attachment?.category === 'pdf'
      ) {
        const formData =
          new FormData()


        formData.append(
          'file',
          attachment.file
        )


        const uploadResponse =
          await fetch(
            'http://127.0.0.1:8000/upload-pdf',
            {
              method: 'POST',

              body: formData,

              signal:
                controller.signal,
            }
          )


        if (!uploadResponse.ok) {
          let errorMessage =
            `PDF upload failed: ${uploadResponse.status}`


          try {
            const errorData =
              await uploadResponse.json()


            if (errorData?.detail) {
              errorMessage =
                `PDF upload failed: ${errorData.detail}`
            }
          } catch {
            // Keep the default error message.
          }


          throw new Error(
            errorMessage
          )
        }
      }


      // ========================================
      // START CHAT STREAM
      // ========================================

      const response =
        await fetch(
          'http://127.0.0.1:8000/chat/stream',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              message: backendMessage,
            }),

            signal:
              controller.signal,
          }
        )


      if (!response.ok) {
        throw new Error(
          `HTTP error: ${response.status}`
        )
      }


      if (!response.body) {
        throw new Error(
          'Streaming response body is missing.'
        )
      }


      const reader =
        response.body.getReader()


      const decoder =
        new TextDecoder()


      let buffer = ''


      // ========================================
      // READ NDJSON STREAM
      // ========================================

      while (true) {
        const {
          value,
          done,
        } = await reader.read()


        if (done) {
          break
        }


        buffer +=
          decoder.decode(
            value,
            {
              stream: true,
            }
          )


        const lines =
          buffer.split('\n')


        buffer =
          lines.pop() || ''


        for (
          const line
          of lines
        ) {
          const trimmedLine =
            line.trim()


          if (!trimmedLine) {
            continue
          }


          try {
            const event =
              JSON.parse(
                trimmedLine
              )


            processStreamEvent(
              event,
              assistantMessageId
            )
          } catch (error) {
            console.error(
              'Stream JSON parse error:',
              trimmedLine,
              error
            )
          }
        }
      }


      // ========================================
      // FINAL BUFFER
      // ========================================

      buffer +=
        decoder.decode()


      const finalLine =
        buffer.trim()


      if (finalLine) {
        try {
          const event =
            JSON.parse(
              finalLine
            )


          processStreamEvent(
            event,
            assistantMessageId
          )
        } catch (error) {
          console.error(
            'Final stream JSON parse error:',
            finalLine,
            error
          )
        }
      }


      finishAssistantMessage(
        assistantMessageId
      )
    } catch (error) {

      // ========================================
      // STOP BUTTON
      // ========================================

      if (
        error.name ===
        'AbortError'
      ) {
        setMessages(
          (currentMessages) =>
            currentMessages.map(
              (message) => {
                if (
                  message.id !==
                  assistantMessageId
                ) {
                  return message
                }


                if (
                  message.text.trim() ===
                  ''
                ) {
                  return {
                    ...message,

                    isThinking:
                      false,

                    isComplete:
                      true,

                    text:
                      'Yanıt durduruldu.',
                  }
                }


                return {
                  ...message,

                  isThinking:
                    false,

                  isComplete:
                    true,
                }
              }
            )
        )
      }

      // ========================================
      // OTHER ERROR
      // ========================================

      else {
        console.error(
          'ChatOmni backend error:',
          error
        )


        setMessages(
          (currentMessages) =>
            currentMessages.map(
              (message) =>
                message.id ===
                assistantMessageId
                  ? {
                      ...message,

                      isThinking:
                        false,

                      isComplete:
                        true,

                      text:
                        message.text ||
                        (
                          error.message
                            ?.startsWith(
                              'PDF upload failed:'
                            )
                            ? error.message
                            : 'ChatOmni backend could not be reached.'
                        ),
                    }
                  : message
            )
        )
      }
    } finally {
      abortControllerRef.current =
        null


      setIsStreaming(false)


      requestAnimationFrame(() => {
        messageInputRef.current?.focus()
      })
    }
  }


  // ========================================
  // KEYBOARD
  // ========================================

  function handleKeyDown(event) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault()


      if (!isStreaming) {
        sendMessage()
      }
    }
  }


  // ========================================
  // THEME
  // ========================================

  function toggleTheme() {
    setTheme(
      theme === 'dark'
        ? 'light'
        : 'dark'
    )
  }


  // ========================================
  // ATTACHMENTS
  // ========================================

  function toggleAttachMenu() {
    setAttachMenuOpen(
      (current) => !current
    )
  }


  function choosePDF() {
    setAttachMenuOpen(false)

    pdfInputRef.current?.click()
  }


  function chooseImage() {
    setAttachMenuOpen(false)

    imageInputRef.current?.click()
  }


  function handlePDFChange(event) {
    const file =
      event.target.files[0]


    if (file) {
      setSelectedFile({
        file,

        name: file.name,

        type: file.type,

        category: 'pdf',
      })
    }


    event.target.value = ''
  }


  function handleImageChange(event) {
    const file =
      event.target.files[0]


    if (file) {
      setSelectedFile({
        file,

        name: file.name,

        type: file.type,

        category: 'image',
      })
    }


    event.target.value = ''
  }


  function removeSelectedFile() {
    setSelectedFile(null)


    requestAnimationFrame(() => {
      messageInputRef.current?.focus()
    })
  }


  // ========================================
  // NEW CHAT
  // ========================================

  function startNewChat() {
    if (isStreaming) {
      stopGeneration()
    }


    setMessages([])

    setInput('')

    setSelectedFile(null)

    setAttachMenuOpen(false)

    setActiveChat(null)


    requestAnimationFrame(() => {
      messageInputRef.current?.focus()
    })
  }


  // ========================================
  // SELECT CHAT
  // ========================================

  function selectChat(chatName) {
    setActiveChat(chatName)

    /*
      Persistent conversation
      sistemi daha sonra bağlanacak.
    */
  }


  // ========================================
  // INPUT COMPONENT
  // ========================================

  function renderInput() {
    return (
      <div className="input-wrapper">

        {selectedFile && (
          <div className="selected-file">

            <div className="selected-file-info">

              <span className="file-icon">
                {selectedFile.category ===
                'pdf'
                  ? 'PDF'
                  : 'IMG'}
              </span>


              <span className="file-name">
                {selectedFile.name}
              </span>

            </div>


            <button
              className="remove-file-button"

              onClick={
                removeSelectedFile
              }

              aria-label="Remove selected file"
            >
              ×
            </button>

          </div>
        )}


        <div className="message-box">

          <div
            className="attach-area"

            ref={attachAreaRef}
          >

            <button
              className="attach-button"

              onClick={
                toggleAttachMenu
              }

              aria-label="Attach file"

              title="Attach"
            >
              +
            </button>


            {attachMenuOpen && (
              <div className="attach-menu">

                <button
                  className="attach-option"

                  onClick={
                    choosePDF
                  }
                >
                  <span className="attach-option-icon">
                    PDF
                  </span>

                  <span>
                    Upload PDF
                  </span>
                </button>


                <button
                  className="attach-option"

                  onClick={
                    chooseImage
                  }
                >
                  <span className="attach-option-icon">
                    IMG
                  </span>

                  <span>
                    Upload Image
                  </span>
                </button>

              </div>
            )}

          </div>


          <input
            ref={pdfInputRef}

            className="hidden-file-input"

            type="file"

            accept="application/pdf"

            onChange={
              handlePDFChange
            }
          />


          <input
            ref={imageInputRef}

            className="hidden-file-input"

            type="file"

            accept="image/*"

            onChange={
              handleImageChange
            }
          />


          <textarea
            ref={messageInputRef}

            className="message-input"

            placeholder="Message ChatOmni..."

            value={input}

            rows={1}

            onChange={(event) =>
              setInput(
                event.target.value
              )
            }

            onKeyDown={
              handleKeyDown
            }
          />


          <button
            className={
              isStreaming
                ? 'send-button stop-button'
                : 'send-button'
            }

            onClick={
              isStreaming
                ? stopGeneration
                : sendMessage
            }

            title={
              isStreaming
                ? 'Stop response'
                : 'Send message'
            }

            aria-label={
              isStreaming
                ? 'Stop response'
                : 'Send message'
            }
          >
            {isStreaming
              ? '■'
              : 'Send'}
          </button>

        </div>

      </div>
    )
  }


  // ========================================
  // MAIN UI
  // ========================================

  return (
    <div className={`app ${theme}`}>


      {/* ========================================
          SIDEBAR
          ======================================== */}

      <aside
        className={`sidebar ${
          sidebarOpen
            ? 'sidebar-open'
            : 'sidebar-closed'
        }`}
      >

        <div className="sidebar-content">


          <button
            className="sidebar-close-button"

            onClick={() =>
              setSidebarOpen(false)
            }

            title="Hide sidebar"

            aria-label="Hide sidebar"
          >
            ‹
          </button>


          <div className="sidebar-top">

            <h2>
              ChatOmni
            </h2>


            <button
              className="new-chat-button"

              onClick={
                startNewChat
              }
            >
              <span className="new-chat-icon">
                +
              </span>

              <span>
                New Chat
              </span>
            </button>

          </div>


          <div className="sidebar-chats">

            <p className="chats-title">
              Chats
            </p>


            <div className="chat-list">

              <button
                className={`chat-item ${
                  activeChat ===
                  'ChatOmni Development'
                    ? 'active'
                    : ''
                }`}

                onClick={() =>
                  selectChat(
                    'ChatOmni Development'
                  )
                }
              >
                ChatOmni Development
              </button>


              <button
                className={`chat-item ${
                  activeChat ===
                  'Python Debugging'
                    ? 'active'
                    : ''
                }`}

                onClick={() =>
                  selectChat(
                    'Python Debugging'
                  )
                }
              >
                Python Debugging
              </button>


              <button
                className={`chat-item ${
                  activeChat ===
                  'AI Internship'
                    ? 'active'
                    : ''
                }`}

                onClick={() =>
                  selectChat(
                    'AI Internship'
                  )
                }
              >
                AI Internship
              </button>

            </div>

          </div>

        </div>

      </aside>


      {/* ========================================
          CHAT AREA
          ======================================== */}

      <main className="chat-area">


        <button
          className={`sidebar-open-button ${
            sidebarOpen
              ? 'sidebar-open-button-hidden'
              : 'sidebar-open-button-visible'
          }`}

          onClick={() =>
            setSidebarOpen(true)
          }

          title="Show sidebar"

          aria-label="Show sidebar"
        >
          ›
        </button>


        <div className="top-controls">

          <button
            className="theme-button"

            onClick={
              toggleTheme
            }
          >
            {theme === 'dark'
              ? '☀ Light'
              : '🌙 Dark'}
          </button>

        </div>


        {/* ========================================
            EMPTY CHAT
            ======================================== */}

        {messages.length === 0 ? (

          <div className="start-screen">

            <div className="welcome">

              <h1>
                ChatOmni
              </h1>

            </div>


            <div className="start-input">
              {renderInput()}
            </div>

          </div>

        ) : (

          <>


            {/* ========================================
                MESSAGES
                ======================================== */}

            <div
              className="messages-scroll"

              ref={
                messagesContainerRef
              }
            >

              <div className="messages">


                {messages.map(
                  (message) =>

                    message.sender ===
                    'user' ? (

                      // ========================================
                      // USER MESSAGE
                      // ========================================

                      <div
                        key={message.id}

                        className="user-message"
                      >

                        {message.file && (
                          <div className="message-file">

                            <span>
                              {message.file
                                .category ===
                              'pdf'
                                ? 'PDF'
                                : 'IMG'}
                            </span>

                            {
                              message.file
                                .name
                            }

                          </div>
                        )}


                        {message.text && (
                          <div>
                            {message.text}
                          </div>
                        )}

                      </div>

                    ) : (

                      // ========================================
                      // ASSISTANT MESSAGE
                      // ========================================

                      <div
                        key={message.id}

                        className="assistant-message"
                      >

                        {message.isThinking ? (

                          // ========================================
                          // THINKING
                          // ========================================

                          <div className="thinking-row">

                            <span className="thinking-label">
                              Thinking
                            </span>


                            <span className="thinking-dots">

                              <span />

                              <span />

                              <span />

                            </span>

                          </div>

                        ) : (

                          // ========================================
                          // ANSWER
                          // ========================================

                          <div className="assistant-text">

                            <MarkdownAnswer
                              text={
                                message.text
                              }

                              tools={
                                message.tools
                              }

                              showToolIcons={
                                message.isComplete
                              }
                            />

                          </div>

                        )}

                      </div>

                    )
                )}

              </div>

            </div>


            {/* ========================================
                BOTTOM INPUT
                ======================================== */}

            <div className="input-area">

              {renderInput()}

            </div>


          </>

        )}


      </main>


    </div>
  )
}


export default App