import {
  Children,
  useEffect,
  useRef,
  useState,
} from 'react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

import 'katex/dist/katex.min.css'
import './App.css'


const TOOL_MARKER =
  '[[CHATOMNI_TOOL_ICONS]]'


// ========================================
// TOOL ICONS
// ========================================

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


function ToolIcons({
  tools,
}) {

  if (
    !tools ||
    tools.length === 0
  ) {
    return null
  }


  return (
    <span
      className="tool-icon-group"

      aria-label={
        `Used tools: ${tools.join(', ')}`
      }
    >

      {tools.map(
        (tool) => (

          <span
            key={tool}
            className="tool-icon"
            title={tool}
          >
            {getToolIcon(tool)}
          </span>

        )
      )}

    </span>
  )
}


function replaceToolMarker(
  children,
  tools
) {

  return Children.map(
    children,

    (child, index) => {

      if (
        typeof child === 'string' &&
        child.includes(
          TOOL_MARKER
        )
      ) {

        const parts =
          child.split(
            TOOL_MARKER
          )


        return (
          <span
            key={
              `tool-marker-${index}`
            }
          >

            {parts[0]}

            <ToolIcons
              tools={tools}
            />

            {
              parts
                .slice(1)
                .join(
                  TOOL_MARKER
                )
            }

          </span>
        )
      }


      return child
    }
  )
}


// ========================================
// REMOVE LATEX \boxed{...}
// ========================================

function removeLatexBoxed(text) {

  if (!text) {
    return ''
  }


  const command =
    '\\boxed{'


  let result = ''

  let index = 0


  while (
    index < text.length
  ) {

    const boxedIndex =
      text.indexOf(
        command,
        index
      )


    if (
      boxedIndex === -1
    ) {

      result +=
        text.slice(
          index
        )

      break
    }


    result +=
      text.slice(
        index,
        boxedIndex
      )


    const contentStart =
      boxedIndex +
      command.length


    let depth = 1

    let position =
      contentStart


    while (
      position <
        text.length &&
      depth > 0
    ) {

      const character =
        text[position]


      const previousCharacter =
        position > 0

          ? text[position - 1]

          : ''


      const escaped =
        previousCharacter ===
        '\\'


      if (
        character === '{' &&
        !escaped
      ) {

        depth += 1
      }

      else if (
        character === '}' &&
        !escaped
      ) {

        depth -= 1
      }


      position += 1
    }


    if (
      depth !== 0
    ) {

      result +=
        text.slice(
          boxedIndex
        )

      break
    }


    result +=
      text.slice(
        contentStart,
        position - 1
      )


    index =
      position
  }


  return result
}


// ========================================
// NORMALIZE MATH
// ========================================

function normalizeMathText(text) {

  if (!text) {
    return ''
  }


  let normalizedText =
    removeLatexBoxed(
      text
    )


  normalizedText =
    normalizedText.replace(

      /\\\[([\s\S]*?)\\\]/g,

      (_, content) =>
        `\n$$\n${content.trim()}\n$$\n`
    )


  normalizedText =
    normalizedText.replace(

      /\\\(([\s\S]*?)\\\)/g,

      (_, content) =>
        `$${content.trim()}$`
    )


  return normalizedText
}


// ========================================
// MARKDOWN ANSWER
// ========================================

function MarkdownAnswer({
  text,
  tools,
  showToolIcons,
}) {

  const hasTools =
    showToolIcons &&
    tools &&
    tools.length > 0


  let markdownText =
    normalizeMathText(
      text
    )


  if (hasTools) {

    const trimmedText =
      markdownText.trimEnd()


    if (
      trimmedText.endsWith(
        '```'
      ) ||

      trimmedText.endsWith(
        '$$'
      )
    ) {

      markdownText =
        `${trimmedText}\n\n${TOOL_MARKER}`
    }

    else {

      markdownText =
        `${trimmedText} ${TOOL_MARKER}`
    }
  }


  const components = {

    p: ({ children }) => (

      <p>
        {
          replaceToolMarker(
            children,
            tools
          )
        }
      </p>

    ),


    h1: ({ children }) => (

      <h1>
        {
          replaceToolMarker(
            children,
            tools
          )
        }
      </h1>

    ),


    h2: ({ children }) => (

      <h2>
        {
          replaceToolMarker(
            children,
            tools
          )
        }
      </h2>

    ),


    h3: ({ children }) => (

      <h3>
        {
          replaceToolMarker(
            children,
            tools
          )
        }
      </h3>

    ),


    h4: ({ children }) => (

      <h4>
        {
          replaceToolMarker(
            children,
            tools
          )
        }
      </h4>

    ),


    h5: ({ children }) => (

      <h5>
        {
          replaceToolMarker(
            children,
            tools
          )
        }
      </h5>

    ),


    h6: ({ children }) => (

      <h6>
        {
          replaceToolMarker(
            children,
            tools
          )
        }
      </h6>

    ),


    li: ({ children }) => (

      <li>
        {
          replaceToolMarker(
            children,
            tools
          )
        }
      </li>

    ),
  }


  return (

    <ReactMarkdown

      remarkPlugins={[
        remarkGfm,
        remarkMath,
      ]}

      rehypePlugins={[
        rehypeKatex,
      ]}

      components={
        components
      }
    >

      {markdownText}

    </ReactMarkdown>
  )
}


// ========================================
// APP
// ========================================

function App() {

  // ========================================
  // STATE
  // ========================================

  const [
    input,
    setInput,
  ] = useState('')


  const [
    messages,
    setMessages,
  ] = useState([])


  const [
    theme,
    setTheme,
  ] = useState(
    'dark'
  )


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
  ] = useState(null)


  const [
    chatId,
    setChatId,
  ] = useState(
    () =>
      crypto.randomUUID()
  )


  const [
    chats,
    setChats,
  ] = useState([])


  const [
    isStreaming,
    setIsStreaming,
  ] = useState(false)


  // ========================================
  // REFS
  // ========================================

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


  const autoScrollEnabledRef =
    useRef(true)


  // ========================================
  // LOAD SAVED CHATS
  // ========================================

  async function loadChats() {

    try {

      const response =
        await fetch(
          'http://127.0.0.1:8000/chats'
        )


      if (!response.ok) {

        throw new Error(
          `Chat list error: ${response.status}`
        )
      }


      const data =
        await response.json()


      setChats(

        Array.isArray(
          data.chats
        )

          ? data.chats

          : []
      )

    }

    catch (error) {

      console.error(
        'Could not load chats:',
        error
      )
    }
  }


  // ========================================
  // LOAD CHAT LIST ON START
  // ========================================

  useEffect(() => {

    loadChats()

  }, [])


  // ========================================
  // CLOSE ATTACHMENT MENU
  // ========================================

  useEffect(() => {

    function handleClickOutside(
      event
    ) {

      if (
        attachMenuOpen &&
        attachAreaRef.current &&
        !attachAreaRef
          .current
          .contains(
            event.target
          )
      ) {

        setAttachMenuOpen(
          false
        )
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

  }, [
    attachMenuOpen,
  ])


  // ========================================
  // KEEP INPUT FOCUSED
  // ========================================

  useEffect(() => {

    requestAnimationFrame(
      () => {

        messageInputRef
          .current
          ?.focus()
      }
    )

  }, [
    messages.length,
  ])


  // ========================================
  // AUTO-GROW TEXTAREA
  // ========================================

  useEffect(() => {

    const textarea =
      messageInputRef.current


    if (!textarea) {
      return
    }


    textarea.style.height =
      'auto'


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

  }, [
    input,
    messages.length,
  ])


  // ========================================
  // SMART AUTO-SCROLL
  // ========================================

  function handleMessagesScroll() {

    const container =
      messagesContainerRef
        .current


    if (!container) {
      return
    }


    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight


    autoScrollEnabledRef
      .current =
        distanceFromBottom <
        120
  }


  useEffect(() => {

    const container =
      messagesContainerRef
        .current


    if (
      !container ||
      !autoScrollEnabledRef
        .current
    ) {

      return
    }


    requestAnimationFrame(
      () => {

        container.scrollTop =
          container.scrollHeight
      }
    )

  }, [
    messages,
  ])


  // ========================================
  // STOP GENERATION
  // ========================================

  function stopGeneration() {

    if (
      abortControllerRef.current
    ) {

      abortControllerRef
        .current
        .abort()
    }
  }


  // ========================================
  // ADD TOOL EVENT
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
  // ADD TOKEN
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

                  isThinking:
                    false,

                  text:
                    message.text +
                    token,
                }

              : message
        )
    )
  }


  // ========================================
  // FINISH RESPONSE
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

                  isThinking:
                    false,

                  isComplete:
                    true,
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
      event.type ===
      'tool'
    ) {

      addToolToMessage(
        assistantMessageId,
        event.name
      )

      return
    }


    if (
      event.type ===
      'token'
    ) {

      addTokenToMessage(
        assistantMessageId,
        event.content
      )

      return
    }


    if (
      event.type ===
      'done'
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


    autoScrollEnabledRef
      .current =
        true


    setActiveChat(
      chatId
    )


    const attachment =
      selectedFile


    const messageText =
      typedMessage ||

      (
        attachment?.category ===
        'pdf'

          ? 'Bu PDF’i kısaca özetle.'

          : attachment?.category ===
            'image'

            ? 'Bu görseli incele ve önemli noktaları açıkla.'

            : ''
      )


    const backendMessage =
      attachment?.category ===
      'pdf'

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

      id:
        userMessageId,

      text:
        messageText,

      sender:
        'user',

      file:
        attachment

          ? {

              name:
                attachment.name,

              type:
                attachment.type,

              category:
                attachment.category,
            }

          : null,
    }


    const assistantMessage = {

      id:
        assistantMessageId,

      text:
        '',

      sender:
        'assistant',

      tools:
        [],

      isThinking:
        true,

      isComplete:
        false,
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

      let imageId =
        null


      // ========================================
      // PDF UPLOAD
      // ========================================

      if (
        attachment?.category ===
        'pdf'
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

              method:
                'POST',

              body:
                formData,

              signal:
                controller.signal,
            }
          )


        if (
          !uploadResponse.ok
        ) {

          let errorMessage =
            `PDF upload failed: ${uploadResponse.status}`


          try {

            const errorData =
              await uploadResponse
                .json()


            if (
              errorData?.detail
            ) {

              errorMessage =
                `PDF upload failed: ${errorData.detail}`
            }

          }

          catch {

            // Keep default message.
          }


          throw new Error(
            errorMessage
          )
        }
      }


      // ========================================
      // IMAGE UPLOAD
      // ========================================

      if (
        attachment?.category ===
        'image'
      ) {

        const formData =
          new FormData()


        formData.append(
          'file',
          attachment.file
        )


        const uploadResponse =
          await fetch(

            'http://127.0.0.1:8000/upload-image',

            {

              method:
                'POST',

              body:
                formData,

              signal:
                controller.signal,
            }
          )


        if (
          !uploadResponse.ok
        ) {

          let errorMessage =
            `Image upload failed: ${uploadResponse.status}`


          try {

            const errorData =
              await uploadResponse
                .json()


            if (
              errorData?.detail
            ) {

              errorMessage =
                `Image upload failed: ${errorData.detail}`
            }

          }

          catch {

            // Keep default message.
          }


          throw new Error(
            errorMessage
          )
        }


        const uploadData =
          await uploadResponse
            .json()


        imageId =
          uploadData.image_id


        if (!imageId) {

          throw new Error(
            'Image upload failed: backend did not return an image ID.'
          )
        }
      }


      // ========================================
      // CHAT REQUEST
      // ========================================

      const requestBody = {

        message:
          backendMessage,

        chat_id:
          chatId,
      }


      if (imageId) {

        requestBody.image_id =
          imageId
      }


      const response =
        await fetch(

          'http://127.0.0.1:8000/chat/stream',

          {

            method:
              'POST',

            headers: {

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                requestBody
              ),

            signal:
              controller.signal,
          }
        )


      if (!response.ok) {

        let errorMessage =
          `HTTP error: ${response.status}`


        try {

          const errorData =
            await response.json()


          if (
            errorData?.detail
          ) {

            errorMessage =
              errorData.detail
          }

        }

        catch {

          // Keep default message.
        }


        throw new Error(
          errorMessage
        )
      }


      if (
        !response.body
      ) {

        throw new Error(
          'Streaming response body is missing.'
        )
      }


      const reader =
        response.body
          .getReader()


      const decoder =
        new TextDecoder()


      let buffer = ''


      while (true) {

        const {
          value,
          done,
        } =
          await reader.read()


        if (done) {
          break
        }


        buffer +=
          decoder.decode(
            value,
            {
              stream:
                true,
            }
          )


        const lines =
          buffer.split(
            '\n'
          )


        buffer =
          lines.pop() ||
          ''


        for (
          const line
          of lines
        ) {

          const trimmedLine =
            line.trim()


          if (
            !trimmedLine
          ) {

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

          }

          catch (error) {

            console.error(
              'Stream JSON parse error:',
              trimmedLine,
              error
            )
          }
        }
      }


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

        }

        catch (error) {

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
    }


    catch (error) {

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
                  message.text
                    .trim() ===
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

      else {

        console.error(
          'ChatOmni backend error:',
          error
        )


        const isUploadError =

          error.message
            ?.startsWith(
              'PDF upload failed:'
            )

          ||

          error.message
            ?.startsWith(
              'Image upload failed:'
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
                          isUploadError

                            ? error.message

                            : 'ChatOmni backend could not be reached.'
                        ),
                    }

                  : message
            )
        )
      }
    }


    finally {

      abortControllerRef.current =
        null


      setIsStreaming(
        false
      )


      await loadChats()


      requestAnimationFrame(
        () => {

          messageInputRef
            .current
            ?.focus()
        }
      )
    }
  }


  // ========================================
  // KEYBOARD
  // ========================================

  function handleKeyDown(
    event
  ) {

    if (
      event.key ===
        'Enter' &&

      !event.shiftKey
    ) {

      event.preventDefault()


      if (
        !isStreaming
      ) {

        sendMessage()
      }
    }
  }


  // ========================================
  // THEME
  // ========================================

  function toggleTheme() {

    setTheme(

      theme ===
      'dark'

        ? 'light'

        : 'dark'
    )
  }


  // ========================================
  // ATTACHMENT MENU
  // ========================================

  function toggleAttachMenu() {

    setAttachMenuOpen(
      (current) =>
        !current
    )
  }


  function choosePDF() {

    setAttachMenuOpen(
      false
    )


    pdfInputRef
      .current
      ?.click()
  }


  function chooseImage() {

    setAttachMenuOpen(
      false
    )


    imageInputRef
      .current
      ?.click()
  }


  // ========================================
  // PDF SELECT
  // ========================================

  function handlePDFChange(
    event
  ) {

    const file =
      event.target.files[0]


    if (file) {

      setSelectedFile({

        file,

        name:
          file.name,

        type:
          file.type,

        category:
          'pdf',
      })
    }


    event.target.value =
      ''
  }


  // ========================================
  // IMAGE SELECT
  // ========================================

  function handleImageChange(
    event
  ) {

    const file =
      event.target.files[0]


    if (!file) {

      event.target.value =
        ''

      return
    }


    const allowedTypes = [

      'image/png',

      'image/jpeg',

      'image/webp',
    ]


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      alert(
        'Supported image formats are PNG, JPG, JPEG, and WEBP.'
      )


      event.target.value =
        ''

      return
    }


    setSelectedFile({

      file,

      name:
        file.name,

      type:
        file.type,

      category:
        'image',
    })


    event.target.value =
      ''
  }


  // ========================================
  // PASTE SCREENSHOT
  // ========================================

  function handlePaste(
    event
  ) {

    const clipboardItems =
      event
        .clipboardData
        ?.items


    if (
      !clipboardItems
    ) {

      return
    }


    const imageItem =
      Array
        .from(
          clipboardItems
        )
        .find(
          (item) =>

            item.type
              .startsWith(
                'image/'
              )
        )


    if (!imageItem) {
      return
    }


    const imageBlob =
      imageItem
        .getAsFile()


    if (!imageBlob) {
      return
    }


    const allowedTypes = [

      'image/png',

      'image/jpeg',

      'image/webp',
    ]


    if (
      !allowedTypes.includes(
        imageBlob.type
      )
    ) {

      alert(
        'Pasted image format is not supported. Use PNG, JPG, JPEG, or WEBP.'
      )

      return
    }


    event.preventDefault()


    let extension =
      'png'


    if (
      imageBlob.type ===
      'image/jpeg'
    ) {

      extension =
        'jpg'
    }


    else if (
      imageBlob.type ===
      'image/webp'
    ) {

      extension =
        'webp'
    }


    const screenshotFile =
      new File(

        [
          imageBlob,
        ],

        `screenshot-${Date.now()}.${extension}`,

        {

          type:
            imageBlob.type,
        }
      )


    setSelectedFile({

      file:
        screenshotFile,

      name:
        screenshotFile.name,

      type:
        screenshotFile.type,

      category:
        'image',
    })


    setAttachMenuOpen(
      false
    )
  }


  // ========================================
  // REMOVE ATTACHMENT
  // ========================================

  function removeSelectedFile() {

    setSelectedFile(
      null
    )


    requestAnimationFrame(
      () => {

        messageInputRef
          .current
          ?.focus()
      }
    )
  }


  // ========================================
  // NEW CHAT
  // ========================================

  function startNewChat() {

    if (isStreaming) {

      stopGeneration()
    }


    const newChatId =
      crypto.randomUUID()


    setChatId(
      newChatId
    )


    setActiveChat(
      null
    )


    setMessages([])

    setInput('')

    setSelectedFile(null)

    setAttachMenuOpen(false)


    autoScrollEnabledRef
      .current =
        true


    requestAnimationFrame(
      () => {

        messageInputRef
          .current
          ?.focus()
      }
    )
  }


  // ========================================
  // SELECT SAVED CHAT
  // ========================================

  async function selectChat(
    chat
  ) {

    if (
      !chat?.chat_id ||
      isStreaming
    ) {

      return
    }


    const selectedChatId =
      chat.chat_id


    setActiveChat(
      selectedChatId
    )


    setChatId(
      selectedChatId
    )


    setInput('')

    setSelectedFile(null)

    setAttachMenuOpen(false)

    setMessages([])


    autoScrollEnabledRef
      .current =
        true


    try {

      const response =
        await fetch(

          `http://127.0.0.1:8000/chats/${encodeURIComponent(selectedChatId)}/messages`
        )


      if (!response.ok) {

        throw new Error(
          `Chat messages error: ${response.status}`
        )
      }


      const data =
        await response.json()


      const savedMessages =
        Array.isArray(
          data.messages
        )

          ? data.messages

          : []


      const baseId =
        Date.now()


      const loadedMessages =
        savedMessages.map(
          (message, index) => {

            if (
              message.sender ===
              'user'
            ) {

              return {

                id:
                  baseId + index,

                text:
                  message.text || '',

                sender:
                  'user',

                file:
                  null,
              }
            }


            return {

              id:
                baseId + index,

              text:
                message.text || '',

              sender:
                'assistant',

              tools:
                [],

              isThinking:
                false,

              isComplete:
                true,
            }
          }
        )


      setMessages(
        loadedMessages
      )


      requestAnimationFrame(
        () => {

          const container =
            messagesContainerRef
              .current


          if (container) {

            container.scrollTop =
              container.scrollHeight
          }
        }
      )

    }

    catch (error) {

      console.error(
        'Could not load chat:',
        error
      )


      setMessages([
        {

          id:
            Date.now(),

          text:
            'Saved chat could not be loaded.',

          sender:
            'assistant',

          tools:
            [],

          isThinking:
            false,

          isComplete:
            true,
        },
      ])
    }
  }


  // ========================================
  // DELETE SAVED CHAT
  // ========================================

  async function deleteSavedChat(
    event,
    chat
  ) {

    event.stopPropagation()


    if (
      !chat?.chat_id ||
      isStreaming
    ) {

      return
    }


    const confirmed =
      window.confirm(
        `Delete "${chat.title || 'New Chat'}"?`
      )


    if (!confirmed) {
      return
    }


    try {

      const response =
        await fetch(

          `http://127.0.0.1:8000/chats/${encodeURIComponent(chat.chat_id)}`,

          {
            method:
              'DELETE',
          }
        )


      if (!response.ok) {

        throw new Error(
          `Delete chat error: ${response.status}`
        )
      }


      if (
        activeChat ===
        chat.chat_id
      ) {

        const newChatId =
          crypto.randomUUID()


        setChatId(
          newChatId
        )


        setActiveChat(
          null
        )


        setMessages([])

        setInput('')

        setSelectedFile(null)

        setAttachMenuOpen(false)
      }


      await loadChats()

    }

    catch (error) {

      console.error(
        'Could not delete chat:',
        error
      )


      alert(
        'Chat could not be deleted.'
      )
    }
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

                {
                  selectedFile
                    .category ===
                  'pdf'

                    ? 'PDF'

                    : 'IMG'
                }

              </span>


              <span className="file-name">

                {
                  selectedFile.name
                }

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

            ref={
              attachAreaRef
            }
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

            ref={
              pdfInputRef
            }

            className="hidden-file-input"

            type="file"

            accept="application/pdf"

            onChange={
              handlePDFChange
            }
          />


          <input

            ref={
              imageInputRef
            }

            className="hidden-file-input"

            type="file"

            accept="image/png,image/jpeg,image/webp"

            onChange={
              handleImageChange
            }
          />


          <textarea

            ref={
              messageInputRef
            }

            className="message-input"

            placeholder="Message ChatOmni..."

            value={
              input
            }

            rows={1}

            onChange={
              (event) =>

                setInput(
                  event
                    .target
                    .value
                )
            }

            onKeyDown={
              handleKeyDown
            }

            onPaste={
              handlePaste
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

            {
              isStreaming

                ? '■'

                : 'Send'
            }

          </button>


        </div>

      </div>
    )
  }


  // ========================================
  // UI
  // ========================================

  return (

    <div
      className={
        `app ${theme}`
      }
    >


      {/* ====================================
          SIDEBAR
          ==================================== */}

      <aside

        className={
          `sidebar ${
            sidebarOpen

              ? 'sidebar-open'

              : 'sidebar-closed'
          }`
        }
      >

        <div className="sidebar-content">


          <button

            className="sidebar-close-button"

            onClick={
              () =>

                setSidebarOpen(
                  false
                )
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


              {
                chats.map(
                  (chat) => (

                    <div

                      key={
                        chat.chat_id
                      }

                      className={
                        `chat-item ${
                          activeChat ===
                          chat.chat_id

                            ? 'active'

                            : ''
                        }`
                      }

                      onClick={
                        () =>
                          selectChat(
                            chat
                          )
                      }

                      role="button"

                      tabIndex={0}

                      title={
                        chat.title ||
                        'New Chat'
                      }

                      onKeyDown={
                        (event) => {

                          if (
                            event.key ===
                              'Enter'
                          ) {

                            selectChat(
                              chat
                            )
                          }
                        }
                      }

                      style={{
                        display:
                          'flex',

                        alignItems:
                          'center',

                        gap:
                          '6px',
                      }}
                    >


                      <span
                        style={{
                          flex:
                            1,

                          minWidth:
                            0,

                          overflow:
                            'hidden',

                          textOverflow:
                            'ellipsis',

                          whiteSpace:
                            'nowrap',
                        }}
                      >

                        {
                          chat.title ||
                          'New Chat'
                        }

                      </span>


                      <button

                        type="button"

                        onClick={
                          (event) =>
                            deleteSavedChat(
                              event,
                              chat
                            )
                        }

                        title="Delete chat"

                        aria-label="Delete chat"

                        style={{
                          width:
                            '28px',

                          height:
                            '28px',

                          flexShrink:
                            0,

                          display:
                            'flex',

                          alignItems:
                            'center',

                          justifyContent:
                            'center',

                          padding:
                            0,

                          border:
                            'none',

                          borderRadius:
                            '7px',

                          background:
                            'transparent',

                          color:
                            'inherit',

                          fontSize:
                            '14px',

                          cursor:
                            'pointer',

                          opacity:
                            0.65,
                        }}
                      >

                        🗑

                      </button>


                    </div>

                  )
                )
              }


            </div>


          </div>


        </div>

      </aside>


      {/* ====================================
          CHAT AREA
          ==================================== */}

      <main className="chat-area">


        <button

          className={
            `sidebar-open-button ${
              sidebarOpen

                ? 'sidebar-open-button-hidden'

                : 'sidebar-open-button-visible'
            }`
          }

          onClick={
            () =>

              setSidebarOpen(
                true
              )
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

            {
              theme ===
              'dark'

                ? '☀ Light'

                : '🌙 Dark'
            }

          </button>


        </div>


        {/* ==================================
            EMPTY CHAT
            ================================== */}

        {

          messages.length ===
          0

            ? (

              <div className="start-screen">


                <div className="welcome">

                  <h1>
                    ChatOmni
                  </h1>

                </div>


                <div className="start-input">

                  {
                    renderInput()
                  }

                </div>


              </div>

            )

            : (

              <>


                {/* ==============================
                    MESSAGES
                    ============================== */}

                <div

                  className="messages-scroll"

                  ref={
                    messagesContainerRef
                  }

                  onScroll={
                    handleMessagesScroll
                  }
                >

                  <div className="messages">


                    {
                      messages.map(
                        (message) =>

                          message.sender ===
                          'user'

                            ? (

                              <div

                                key={
                                  message.id
                                }

                                className="user-message"
                              >


                                {message.file && (

                                  <div className="message-file">


                                    <span>

                                      {
                                        message
                                          .file
                                          .category ===
                                        'pdf'

                                          ? 'PDF'

                                          : 'IMG'
                                      }

                                    </span>


                                    {
                                      message
                                        .file
                                        .name
                                    }


                                  </div>

                                )}


                                {message.text && (

                                  <div>

                                    {
                                      message.text
                                    }

                                  </div>

                                )}


                              </div>

                            )

                            : (

                              <div

                                key={
                                  message.id
                                }

                                className="assistant-message"
                              >


                                {
                                  message.isThinking

                                    ? (

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

                                    )

                                    : (

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

                                    )
                                }


                              </div>

                            )
                      )
                    }


                  </div>

                </div>


                {/* ==============================
                    BOTTOM INPUT
                    ============================== */}

                <div className="input-area">

                  {
                    renderInput()
                  }

                </div>


              </>

            )
        }


      </main>


    </div>
  )
}


export default App