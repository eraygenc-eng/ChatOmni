import {
    Children,
    useEffect,
    useRef,
    useState,
} from 'react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import 'katex/dist/katex.min.css';
import './App.css';


const TOOL_MARKER =
    '[[CHATOMNI_TOOL_ICONS]]';


const API_BASE_URL =
    '/api';


const AUTH_TOKEN_KEY =
    'chatomni_access_token';


const CHAT_RESPONSE_START_TIMEOUT_MS =
    150 * 1000;


const CHAT_STREAM_IDLE_TIMEOUT_MS =
    180 * 1000;


const SUPPORTED_TEXT_FILE_EXTENSIONS = [
    '.txt',
    '.md',
    '.markdown',
    '.csv',
    '.json',
    '.jsonc',
    '.xml',
    '.yaml',
    '.yml',
    '.toml',
    '.ini',
    '.cfg',
    '.conf',
    '.log',
    '.properties',
    '.html',
    '.htm',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.ts',
    '.tsx',
    '.py',
    '.pyw',
    '.java',
    '.kt',
    '.kts',
    '.scala',
    '.c',
    '.h',
    '.cpp',
    '.cc',
    '.cxx',
    '.hpp',
    '.cs',
    '.vb',
    '.fs',
    '.fsx',
    '.go',
    '.rs',
    '.swift',
    '.dart',
    '.php',
    '.rb',
    '.sh',
    '.bash',
    '.zsh',
    '.fish',
    '.ps1',
    '.bat',
    '.cmd',
    '.sql',
    '.graphql',
    '.gql',
    '.proto',
    '.vue',
    '.svelte',
    '.r',
    '.lua',
    '.pl',
    '.pm',
    '.ex',
    '.exs',
    '.erl',
    '.hrl',
    '.clj',
    '.cljs',
    '.cljc',
    '.groovy',
    '.gradle',
    '.tex',
    '.bib',
    '.asm',
    '.s',
    '.ipynb',
];


const SUPPORTED_FILE_ACCEPT = [
    '.pdf',
    '.docx',
    ...SUPPORTED_TEXT_FILE_EXTENSIONS,
].join(',');


// ========================================
// CLIENT ID
// ========================================

function createClientId() {

    const cryptoObject =
        globalThis.crypto;


    if (
        cryptoObject
            ?.randomUUID
    ) {

        return cryptoObject
            .randomUUID();
    }


    const bytes =
        new Uint8Array(16);


    if (
        cryptoObject
            ?.getRandomValues
    ) {

        cryptoObject
            .getRandomValues(
                bytes
            );
    }

    else {

        for (
            let index = 0;
            index < bytes.length;
            index += 1
        ) {

            bytes[index] =
                Math.floor(
                    Math.random() * 256
                );
        }
    }


    bytes[6] =
        (
            bytes[6] & 0x0f
        )
        |
        0x40;


    bytes[8] =
        (
            bytes[8] & 0x3f
        )
        |
        0x80;


    return Array
        .from(
            bytes
        )
        .map(
            (
                byte,
                index
            ) => {

                const hex =
                    byte
                        .toString(16)
                        .padStart(
                            2,
                            '0'
                        );


                if (
                    [
                        4,
                        6,
                        8,
                        10,
                    ].includes(
                        index
                    )
                ) {

                    return `-${hex}`;
                }


                return hex;
            }
        )
        .join('');
}


function getStoredAuthToken() {

    return (
        localStorage.getItem(
            AUTH_TOKEN_KEY
        )
        ||
        ''
    );
}


function getAuthHeaders(
    extraHeaders = {}
) {

    const token =
        getStoredAuthToken();


    if (!token) {

        return {
            ...extraHeaders,
        };
    }


    return {
        ...extraHeaders,

        Authorization:
            `Bearer ${token}`,
    };
}


async function authFetch(
    url,
    options = {}
) {

    return fetch(
        url,

        {
            ...options,

            headers:
                getAuthHeaders(
                    options.headers
                    ||
                    {}
                ),
        }
    );
}


async function readStreamChunkWithTimeout(
    reader,
    timeoutMs
) {

    let timeoutId =
        null;


    try {

        return await Promise.race([
            reader.read(),

            new Promise(
                (
                    _,
                    reject
                ) => {

                    timeoutId =
                        window.setTimeout(
                            () => {

                                const error =
                                    new Error(
                                        'The response stream was idle for too long. Please try again.'
                                    );


                                error.name =
                                    'StreamTimeoutError';


                                reject(
                                    error
                                );
                            },
                            timeoutMs
                        );
                }
            ),
        ]);

    }

    finally {

        if (
            timeoutId !==
            null
        ) {

            window.clearTimeout(
                timeoutId
            );
        }
    }
}


// ========================================
// TOOL ICONS
// ========================================

function getToolIcon(
    toolName
) {
    switch (toolName) {

        case 'Memory':
            return '🧠';

        case 'Web':
            return '🌐';

        case 'Calculator':
            return '∑';

        case 'Currency':
            return '⇄';

        case 'RAG':
            return '📄';

        case 'Code':
        case 'code_sandbox':
        case 'Code Sandbox':
            return '</>';

        case 'create_code_file':
        case 'Create Code File':
            return '⇩';

        case 'project_search':
        case 'Project Search':
        case 'Project':
            return '◇';

        default:
            return '◆';
    }
}


function ToolIcons({
    tools,
}) {

    if (
        !tools ||
        tools.length === 0
    ) {
        return null;
    }


    return (
        <span
            className="tool-icon-group"
            aria-label={
                `Used tools: ${
                    tools.join(', ')
                }`
            }
        >
            {
                tools.map(
                    (tool) => (
                        <span
                            key={
                                tool
                            }
                            className="tool-icon"
                            title={
                                tool
                            }
                            style={{
                                fontSize:
                                    '1.15em',

                                lineHeight:
                                    1,
                            }}
                        >
                            {
                                getToolIcon(
                                    tool
                                )
                            }
                        </span>
                    )
                )
            }
        </span>
    );
}


function replaceToolMarker(
    children,
    tools
) {

    return Children.map(
        children,

        (
            child,
            index
        ) => {

            if (
                typeof child ===
                    'string'
                &&
                child.includes(
                    TOOL_MARKER
                )
            ) {

                const parts =
                    child.split(
                        TOOL_MARKER
                    );


                return (
                    <span
                        key={
                            `tool-marker-${index}`
                        }
                    >
                        {
                            parts[0]
                        }

                        <ToolIcons
                            tools={
                                tools
                            }
                        />

                        {
                            parts
                                .slice(1)
                                .join(
                                    TOOL_MARKER
                                )
                        }
                    </span>
                );
            }


            return child;
        }
    );
}


// ========================================
// REMOVE LATEX \boxed{...}
// ========================================

function removeLatexBoxed(
    text
) {

    if (!text) {
        return '';
    }


    const command =
        '\\boxed{';


    let result =
        '';

    let index =
        0;


    while (
        index <
        text.length
    ) {

        const boxedIndex =
            text.indexOf(
                command,
                index
            );


        if (
            boxedIndex ===
            -1
        ) {

            result +=
                text.slice(
                    index
                );

            break;
        }


        result +=
            text.slice(
                index,
                boxedIndex
            );


        const contentStart =
            boxedIndex +
            command.length;


        let depth =
            1;

        let position =
            contentStart;


        while (
            position <
                text.length
            &&
            depth > 0
        ) {

            const character =
                text[position];


            const previousCharacter =
                position > 0
                    ? text[
                        position - 1
                    ]
                    : '';


            const escaped =
                previousCharacter ===
                '\\';


            if (
                character ===
                    '{'
                &&
                !escaped
            ) {
                depth += 1;
            }

            else if (
                character ===
                    '}'
                &&
                !escaped
            ) {
                depth -= 1;
            }


            position += 1;
        }


        if (
            depth !== 0
        ) {

            result +=
                text.slice(
                    boxedIndex
                );

            break;
        }


        result +=
            text.slice(
                contentStart,
                position - 1
            );


        index =
            position;
    }


    return result;
}


// ========================================
// NORMALIZE MATH
// ========================================

function normalizeMathText(
    text
) {

    if (!text) {
        return '';
    }


    let normalizedText =
        removeLatexBoxed(
            text
        );


    normalizedText =
        normalizedText.replace(
            /\\\[([\s\S]*?)\\\]/g,

            (
                _,
                content
            ) =>
                `\n$$\n${content.trim()}\n$$\n`
        );


    normalizedText =
        normalizedText.replace(
            /\\\(([\s\S]*?)\\\)/g,

            (
                _,
                content
            ) =>
                `$${content.trim()}$`
        );


    return normalizedText;
}


// ========================================
// CODE BLOCK COPY
// ========================================

function getNodeText(
    node
) {

    if (
        typeof node ===
            'string'
        ||
        typeof node ===
            'number'
    ) {
        return String(
            node
        );
    }


    if (
        Array.isArray(
            node
        )
    ) {

        return node
            .map(
                (item) =>
                    getNodeText(
                        item
                    )
            )
            .join('');
    }


    if (
        node
        &&
        typeof node ===
            'object'
        &&
        node.props
    ) {

        return getNodeText(
            node.props
                .children
        );
    }


    return '';
}


async function copyTextToClipboard(
    text
) {

    if (
        navigator.clipboard
        &&
        window.isSecureContext
    ) {

        await navigator
            .clipboard
            .writeText(
                text
            );

        return;
    }


    const textarea =
        document
            .createElement(
                'textarea'
            );


    textarea.value =
        text;

    textarea.style.position =
        'fixed';

    textarea.style.opacity =
        '0';

    textarea.style.pointerEvents =
        'none';


    document.body
        .appendChild(
            textarea
        );


    textarea.focus();
    textarea.select();


    document.execCommand(
        'copy'
    );


    document.body
        .removeChild(
            textarea
        );
}


function CodeBlock({
    children,
}) {

    const [
        copied,
        setCopied,
    ] = useState(
        false
    );


    async function handleCopy() {

        const codeText =
            getNodeText(
                children
            );


        try {

            await copyTextToClipboard(
                codeText
            );


            setCopied(
                true
            );


            window.setTimeout(
                () => {

                    setCopied(
                        false
                    );

                },
                1400
            );

        }

        catch (error) {

            console.error(
                'Could not copy code:',
                error
            );
        }
    }


    return (
        <div className="code-block-wrapper">

            <button
                type="button"
                className={
                    copied
                        ? 'code-copy-button copied'
                        : 'code-copy-button'
                }
                onClick={
                    handleCopy
                }
                title={
                    copied
                        ? 'Copied'
                        : 'Copy code'
                }
                aria-label={
                    copied
                        ? 'Code copied'
                        : 'Copy code'
                }
            >
                {
                    copied
                        ? 'Copied'
                        : 'Copy'
                }
            </button>


            <pre>
                {children}
            </pre>

        </div>
    );
}


// ========================================
// GENERATED FILE
// ========================================

function formatFileSize(
    size
) {

    const numericSize =
        Number(
            size
        );


    if (
        !Number.isFinite(
            numericSize
        )
        ||
        numericSize <= 0
    ) {
        return '';
    }


    if (
        numericSize <
        1024
    ) {
        return `${numericSize} B`;
    }


    return (
        `${(
            numericSize /
            1024
        ).toFixed(1)} KB`
    );
}


function GeneratedFileCard({
    file,
}) {

    const [
        isSaving,
        setIsSaving,
    ] = useState(
        false
    );


    if (
        !file
        ||
        !file.file_id
    ) {
        return null;
    }


    const downloadUrl =
        `${API_BASE_URL}/generated-files/${
            encodeURIComponent(
                file.file_id
            )
        }`;


    const sizeText =
        formatFileSize(
            file.size
        );


    async function handleDownload() {

        if (isSaving) {
            return;
        }


        setIsSaving(
            true
        );


        try {

            if (
                'showSaveFilePicker'
                in window
            ) {

                let fileHandle;


                try {

                    fileHandle =
                        await window
                            .showSaveFilePicker({
                                suggestedName:
                                    file.filename
                                    ||
                                    'code-file.txt',
                            });

                }

                catch (error) {

                    if (
                        error.name ===
                        'AbortError'
                    ) {
                        return;
                    }


                    throw error;
                }


                const response =
                    await authFetch(
                        downloadUrl
                    );


                if (
                    !response.ok
                ) {

                    throw new Error(
                        `File download failed: ${
                            response.status
                        }`
                    );
                }


                const blob =
                    await response
                        .blob();


                const writable =
                    await fileHandle
                        .createWritable();


                await writable.write(
                    blob
                );


                await writable.close();


                return;
            }


            const response =
                await authFetch(
                    downloadUrl
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    `File download failed: ${
                        response.status
                    }`
                );
            }


            const blob =
                await response
                    .blob();


            const objectUrl =
                URL.createObjectURL(
                    blob
                );


            const link =
                document
                    .createElement(
                        'a'
                    );


            link.href =
                objectUrl;


            link.download =
                file.filename
                ||
                'code-file';


            document.body
                .appendChild(
                    link
                );


            link.click();


            document.body
                .removeChild(
                    link
                );


            URL.revokeObjectURL(
                objectUrl
            );

        }

        catch (error) {

            console.error(
                'Could not save generated file:',
                error
            );


            alert(
                'File could not be saved.'
            );

        }

        finally {

            setIsSaving(
                false
            );
        }
    }


    return (
        <div
            className="selected-file"
            style={{
                marginTop:
                    '12px',
            }}
        >

            <div className="selected-file-info">

                <span className="file-icon">
                    CODE
                </span>


                <span className="file-name">
                    {
                        file.filename
                        ||
                        'code-file'
                    }
                </span>


                {
                    sizeText && (
                        <span
                            style={{
                                fontSize:
                                    '11px',

                                opacity:
                                    0.55,

                                whiteSpace:
                                    'nowrap',
                            }}
                        >
                            {sizeText}
                        </span>
                    )
                }

            </div>


            <button
                type="button"
                onClick={
                    handleDownload
                }
                disabled={
                    isSaving
                }
                style={{
                    display:
                        'inline-flex',

                    alignItems:
                        'center',

                    justifyContent:
                        'center',

                    height:
                        '28px',

                    padding:
                        '0 10px',

                    marginLeft:
                        '6px',

                    border:
                        '1px solid var(--border-color)',

                    borderRadius:
                        '7px',

                    background:
                        'var(--surface-hover)',

                    color:
                        'var(--text-primary)',

                    fontSize:
                        '11px',

                    fontWeight:
                        600,

                    cursor:
                        isSaving
                            ? 'default'
                            : 'pointer',

                    opacity:
                        isSaving
                            ? 0.6
                            : 1,
                }}
            >
                {
                    isSaving
                        ? 'Saving...'
                        : 'Download'
                }
            </button>

        </div>
    );
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
        showToolIcons
        &&
        tools
        &&
        tools.length > 0;


    let markdownText =
        normalizeMathText(
            text
        );


    if (hasTools) {

        const trimmedText =
            markdownText
                .trimEnd();


        if (
            trimmedText.endsWith(
                '```'
            )
            ||
            trimmedText.endsWith(
                '$$'
            )
        ) {

            markdownText =
                `${trimmedText}\n\n${TOOL_MARKER}`;

        }

        else {

            markdownText =
                `${trimmedText} ${TOOL_MARKER}`;
        }
    }


    const components = {

        pre: ({
            children,
        }) => (
            <CodeBlock>
                {children}
            </CodeBlock>
        ),


        p: ({
            children,
        }) => (
            <p>
                {
                    replaceToolMarker(
                        children,
                        tools
                    )
                }
            </p>
        ),


        h1: ({
            children,
        }) => (
            <h1>
                {
                    replaceToolMarker(
                        children,
                        tools
                    )
                }
            </h1>
        ),


        h2: ({
            children,
        }) => (
            <h2>
                {
                    replaceToolMarker(
                        children,
                        tools
                    )
                }
            </h2>
        ),


        h3: ({
            children,
        }) => (
            <h3>
                {
                    replaceToolMarker(
                        children,
                        tools
                    )
                }
            </h3>
        ),


        h4: ({
            children,
        }) => (
            <h4>
                {
                    replaceToolMarker(
                        children,
                        tools
                    )
                }
            </h4>
        ),


        h5: ({
            children,
        }) => (
            <h5>
                {
                    replaceToolMarker(
                        children,
                        tools
                    )
                }
            </h5>
        ),


        h6: ({
            children,
        }) => (
            <h6>
                {
                    replaceToolMarker(
                        children,
                        tools
                    )
                }
            </h6>
        ),


        li: ({
            children,
        }) => (
            <li>
                {
                    replaceToolMarker(
                        children,
                        tools
                    )
                }
            </li>
        ),
    };


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
    );
}


// ========================================
// CONVERSATION TOPICS
// ========================================

const CONVERSATION_FILLER_MESSAGES =
    new Set([
        'tamam',
        'tamamdır',
        'ok',
        'okay',
        'oldu',
        'olur',
        'evet',
        'aynen',
        'yaptım',
        'yaptim',
        'devam',
        'devam et',
        'açıldı',
        'acildi',
        'çalıştı',
        'calisti',
        'süper',
        'super',
        'iyi',
    ]);


const CONVERSATION_TOPIC_DEFINITIONS = [
    {
        key: 'automotive',
        label: 'Araç / ikinci el',
        icon: '🚗',
        keywords: [
            'araba',
            'araç',
            'arac',
            'otomobil',
            'sahibinden',
            'ikinci el',
            'sıfır araç',
            'sifir arac',
            'kilometre',
            'km',
        ],
    },
    {
        key: 'deployment',
        label: 'Deployment',
        icon: '🚀',
        keywords: [
            'deploy',
            'deployment',
            'aws',
            'ec2',
            'docker',
            'nginx',
            'sunucu',
            'server',
        ],
    },
    {
        key: 'https',
        label: 'HTTPS / güvenlik',
        icon: '🔒',
        keywords: [
            'https',
            'ssl',
            'tls',
            'sertifika',
            'certificate',
            'certbot',
            'domain',
        ],
    },
    {
        key: 'scroll',
        label: 'Scroll davranışı',
        icon: '↕',
        keywords: [
            'scroll',
            'auto-scroll',
            'autoscroll',
            'kaydır',
            'kaydir',
            'aşağı çek',
            'asagi cek',
            'yukarı çık',
            'yukari cik',
        ],
    },
    {
        key: 'navigator',
        label: 'Konu navigasyonu',
        icon: '⌘',
        keywords: [
            'navigator',
            'navigasyon',
            'konu başlık',
            'konu baslik',
            'sağdaki simge',
            'sagdaki simge',
            'sağ taraf',
            'sag taraf',
        ],
    },
    {
        key: 'auth',
        label: 'Giriş / hesap',
        icon: '◉',
        keywords: [
            'login',
            'register',
            'auth',
            'jwt',
            'hesap oluştur',
            'hesap olustur',
            'giriş yap',
            'giris yap',
        ],
    },
    {
        key: 'files',
        label: 'Dosyalar',
        icon: '📄',
        keywords: [
            'docx',
            'pdf',
            'xlsx',
            'pptx',
            'csv',
            'dosya',
            'upload',
            'download',
            'yükle',
            'yukle',
            'indir',
        ],
    },
    {
        key: 'projects',
        label: 'Projects / ZIP',
        icon: '◇',
        keywords: [
            'project',
            'proje',
            'zip',
            'codebase',
        ],
    },
    {
        key: 'database',
        label: 'Veritabanı',
        icon: '▦',
        keywords: [
            'postgres',
            'postgresql',
            'database',
            'veritaban',
            'sql',
        ],
    },
    {
        key: 'code',
        label: 'Kod / debug',
        icon: '</>',
        keywords: [
            'kod',
            'code',
            'jsx',
            'css',
            'python',
            'javascript',
            'typescript',
            'backend',
            'frontend',
            'api',
            'bug',
            'hata',
            'debug',
        ],
    },
    {
        key: 'ai',
        label: 'AI / model',
        icon: '✦',
        keywords: [
            'gpt',
            'luna',
            'terra',
            'llm',
            'agent',
            'prompt',
            'yapay zeka',
            'ai model',
        ],
    },
];


const CONVERSATION_TOPIC_STOP_WORDS =
    new Set([
        'acaba',
        'ama',
        'bana',
        'ben',
        'bence',
        'bir',
        'biraz',
        'biz',
        'bu',
        'bunu',
        'bunun',
        'da',
        'daha',
        'de',
        'diye',
        'gibi',
        'ile',
        'için',
        'icin',
        'mı',
        'mi',
        'mu',
        'mü',
        'ne',
        'nasıl',
        'nasil',
        'o',
        'olarak',
        'sen',
        'senle',
        'şey',
        'sey',
        'şimdi',
        'simdi',
        'şu',
        'su',
        've',
        'ya',
        'yani',
        'yapalım',
        'yapalim',
    ]);


function normalizeConversationTopicText(
    text
) {

    return String(
        text
        ||
        ''
    )
        .toLocaleLowerCase('tr-TR')
        .replace(
            /\s+/g,
            ' '
        )
        .trim();
}


function isConversationFillerMessage(
    text
) {

    const normalizedText =
        normalizeConversationTopicText(
            text
        )
            .replace(
                /[.!?,;:]+$/g,
                ''
            )
            .trim();


    if (!normalizedText) {
        return true;
    }


    return CONVERSATION_FILLER_MESSAGES
        .has(
            normalizedText
        );
}


function getConversationTopicWords(
    text
) {

    return normalizeConversationTopicText(
        text
    )
        .replace(
            /[^a-z0-9çğıöşü]+/gi,
            ' '
        )
        .split(
            /\s+/
        )
        .map(
            (word) =>
                word.trim()
        )
        .filter(
            (word) =>
                word.length >= 3
                &&
                !CONVERSATION_TOPIC_STOP_WORDS
                    .has(
                        word
                    )
        );
}


function getConversationTopicDefinition(
    text
) {

    const normalizedText =
        normalizeConversationTopicText(
            text
        );


    return (
        CONVERSATION_TOPIC_DEFINITIONS
            .find(
                (definition) =>
                    definition.keywords
                        .some(
                            (keyword) =>
                                normalizedText
                                    .includes(
                                        keyword
                                    )
                        )
            )
        ||
        null
    );
}


function buildConversationTopicLabel(
    text,
    definition
) {

    if (definition) {
        return definition.label;
    }


    const cleanText =
        String(
            text
            ||
            ''
        )
            .replace(
                /\s+/g,
                ' '
            )
            .trim();


    if (
        cleanText.length <=
        42
    ) {
        return cleanText;
    }


    return `${cleanText.slice(0, 39).trimEnd()}…`;
}


function shouldMergeConversationTopics(
    previousTopic,
    nextTopic
) {

    if (!previousTopic) {
        return false;
    }


    if (
        previousTopic.category !==
            'general'
        &&
        previousTopic.category ===
            nextTopic.category
    ) {
        return true;
    }


    if (
        previousTopic.category !==
            'general'
        ||
        nextTopic.category !==
            'general'
    ) {
        return false;
    }


    const previousWords =
        new Set(
            previousTopic.words
        );


    const commonWordCount =
        nextTopic.words
            .filter(
                (word) =>
                    previousWords
                        .has(
                            word
                        )
            )
            .length;


    return commonWordCount >= 2;
}


function buildConversationTopics(
    messages
) {

    const topics = [];


    (
        messages
        ||
        []
    )
        .filter(
            (message) =>
                message
                    ?.sender ===
                    'user'
        )
        .forEach(
            (message) => {

                const text =
                    String(
                        message.text
                        ||
                        ''
                    )
                        .trim();


                const hasAttachment =
                    Boolean(
                        message.file
                        ||
                        (
                            Array.isArray(
                                message.attachments
                            )
                            &&
                            message.attachments
                                .length > 0
                        )
                    );


                if (
                    !hasAttachment
                    &&
                    isConversationFillerMessage(
                        text
                    )
                ) {
                    return;
                }


                const definition =
                    getConversationTopicDefinition(
                        text
                    );


                const nextTopic = {
                    messageId:
                        message.id,

                    category:
                        definition
                            ?.key
                        ||
                        'general',

                    label:
                        buildConversationTopicLabel(
                            text
                            ||
                            message.file
                                ?.name
                            ||
                            message.attachments
                                ?.[0]
                                ?.name
                            ||
                            'Dosya',
                            definition
                        ),

                    icon:
                        definition
                            ?.icon
                        ||
                        (
                            hasAttachment

                                ? '📎'

                                : '◆'
                        ),

                    words:
                        getConversationTopicWords(
                            text
                        ),
                };


                const previousTopic =
                    topics[
                        topics.length - 1
                    ];


                if (
                    shouldMergeConversationTopics(
                        previousTopic,
                        nextTopic
                    )
                ) {
                    return;
                }


                topics.push(
                    nextTopic
                );
            }
        );


    return topics;
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
    ] = useState('');


    const [
        messages,
        setMessages,
    ] = useState([]);


    const [
        activeTopicMessageId,
        setActiveTopicMessageId,
    ] = useState(
        null
    );


    const conversationTopics =
        buildConversationTopics(
            messages
        );


    const [
        theme,
        setTheme,
    ] = useState(
        'dark'
    );


    const [
        sidebarOpen,
        setSidebarOpen,
    ] = useState(
        true
    );


    const [
        selectedFile,
        setSelectedFile,
    ] = useState(
        null
    );


    const [
        selectedImages,
        setSelectedImages,
    ] = useState(
        []
    );


    const [
        attachMenuOpen,
        setAttachMenuOpen,
    ] = useState(
        false
    );


    const [
        activeChat,
        setActiveChat,
    ] = useState(
        null
    );


    const [
        chatId,
        setChatId,
    ] = useState(
        () =>
            createClientId()
    );


    const [
        chats,
        setChats,
    ] = useState([]);


    const [
        projects,
        setProjects,
    ] = useState([]);


    const [
        activeProject,
        setActiveProject,
    ] = useState(
        null
    );


    const [
        expandedProjectId,
        setExpandedProjectId,
    ] = useState(
        null
    );


    const [
        projectChats,
        setProjectChats,
    ] = useState([]);


    const [
        isCreatingProject,
        setIsCreatingProject,
    ] = useState(
        false
    );


    const [
        isStreaming,
        setIsStreaming,
    ] = useState(
        false
    );


    const [
        selectedModel,
        setSelectedModel,
    ] = useState(
        'luna'
    );


    const [
        modelMenuOpen,
        setModelMenuOpen,
    ] = useState(
        false
    );


    const [
        authToken,
        setAuthToken,
    ] = useState(
        () =>
            getStoredAuthToken()
    );


    const [
        currentUser,
        setCurrentUser,
    ] = useState(
        null
    );


    const [
        authChecking,
        setAuthChecking,
    ] = useState(
        true
    );


    const [
        authMode,
        setAuthMode,
    ] = useState(
        'login'
    );


    const [
        authName,
        setAuthName,
    ] = useState(
        ''
    );


    const [
        authEmail,
        setAuthEmail,
    ] = useState(
        ''
    );


    const [
        authPassword,
        setAuthPassword,
    ] = useState(
        ''
    );


    const [
        authError,
        setAuthError,
    ] = useState(
        ''
    );


    const [
        authLoading,
        setAuthLoading,
    ] = useState(
        false
    );


    // ========================================
    // REFS
    // ========================================

    const fileInputRef =
        useRef(
            null
        );


    const imageInputRef =
        useRef(
            null
        );


    const projectZipInputRef =
        useRef(
            null
        );


    const attachAreaRef =
        useRef(
            null
        );


    const modelAreaRef =
        useRef(
            null
        );


    const messageInputRef =
        useRef(
            null
        );


    const messagesContainerRef =
        useRef(
            null
        );


    const abortControllerRef =
        useRef(
            null
        );


    const streamDoneRef =
        useRef(
            Promise.resolve()
        );


    const autoScrollEnabledRef =
        useRef(
            true
        );


    const autoScrollFrameRef =
        useRef(
            null
        );


    const lastScrollTopRef =
        useRef(
            0
        );


    // ========================================
    // AUTH
    // ========================================

    function resetUserWorkspace() {

        if (
            abortControllerRef
                .current
        ) {

            abortControllerRef
                .current
                .abort();
        }


        abortControllerRef
            .current =
                null;


        setInput(
            ''
        );


        setMessages(
            []
        );


        setActiveTopicMessageId(
            null
        );


        setSelectedFile(
            null
        );


        setSelectedImages(
            []
        );


        setAttachMenuOpen(
            false
        );


        setActiveChat(
            null
        );


        setChatId(
            createClientId()
        );


        setChats(
            []
        );


        setProjects(
            []
        );


        setActiveProject(
            null
        );


        setExpandedProjectId(
            null
        );


        setProjectChats(
            []
        );


        setIsCreatingProject(
            false
        );


        setIsStreaming(
            false
        );


        setSelectedModel(
            'luna'
        );


        setModelMenuOpen(
            false
        );


        autoScrollEnabledRef
            .current =
                true;
    }


    function handleLogout() {

        localStorage.removeItem(
            AUTH_TOKEN_KEY
        );


        setAuthToken(
            ''
        );


        setCurrentUser(
            null
        );


        setAuthPassword(
            ''
        );


        setAuthError(
            ''
        );


        setAuthMode(
            'login'
        );


        resetUserWorkspace();
    }


    function switchAuthMode() {

        setAuthMode(
            (
                currentMode
            ) =>
                currentMode ===
                    'login'

                    ? 'register'

                    : 'login'
        );


        setAuthError(
            ''
        );


        setAuthPassword(
            ''
        );
    }


    async function restoreAuthSession() {

        const token =
            getStoredAuthToken();


        if (!token) {

            setAuthChecking(
                false
            );

            return;
        }


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/auth/me`,

                    {
                        headers:
                            getAuthHeaders(),
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Session check failed: ${
                        response.status
                    }`
                );
            }


            const user =
                await response
                    .json();


            setAuthToken(
                token
            );


            setCurrentUser(
                user
            );

        }

        catch (error) {

            console.error(
                'Could not restore auth session:',
                error
            );


            localStorage.removeItem(
                AUTH_TOKEN_KEY
            );


            setAuthToken(
                ''
            );


            setCurrentUser(
                null
            );

        }

        finally {

            setAuthChecking(
                false
            );
        }
    }


    async function handleAuthSubmit(
        event
    ) {

        event.preventDefault();


        if (authLoading) {
            return;
        }


        const cleanName =
            authName
                .trim();


        const cleanEmail =
            authEmail
                .trim()
                .toLowerCase();


        const cleanPassword =
            authPassword;


        if (
            !cleanEmail
            ||
            !cleanPassword
        ) {

            setAuthError(
                'Email and password are required.'
            );

            return;
        }


        if (
            authMode ===
                'register'
            &&
            !cleanName
        ) {

            setAuthError(
                'Name is required.'
            );

            return;
        }


        setAuthLoading(
            true
        );


        setAuthError(
            ''
        );


        try {

            const endpoint =
                authMode ===
                    'register'

                    ? '/auth/register'

                    : '/auth/login';


            const requestBody =
                authMode ===
                    'register'

                    ? {
                        name:
                            cleanName,

                        email:
                            cleanEmail,

                        password:
                            cleanPassword,
                    }

                    : {
                        email:
                            cleanEmail,

                        password:
                            cleanPassword,
                    };


            const response =
                await fetch(
                    `${API_BASE_URL}${endpoint}`,

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
                    }
                );


            let data =
                null;


            try {

                data =
                    await response
                        .json();

            }

            catch {

                data =
                    null;
            }


            if (!response.ok) {

                const detail =
                    data
                        ?.detail;


                throw new Error(
                    typeof detail ===
                        'string'

                        ? detail

                        : (
                            authMode ===
                                'register'

                                ? 'Account could not be created.'

                                : 'Email or password is incorrect.'
                        )
                );
            }


            const token =
                data
                    ?.access_token;


            const user =
                data
                    ?.user;


            if (
                !token
                ||
                !user
            ) {

                throw new Error(
                    'Authentication response is incomplete.'
                );
            }


            localStorage.setItem(
                AUTH_TOKEN_KEY,
                token
            );


            resetUserWorkspace();


            setAuthToken(
                token
            );


            setCurrentUser(
                user
            );


            setAuthPassword(
                ''
            );


            setAuthError(
                ''
            );

        }

        catch (error) {

            console.error(
                'Authentication failed:',
                error
            );


            setAuthError(
                error.message
                ||
                'Authentication failed.'
            );

        }

        finally {

            setAuthLoading(
                false
            );
        }
    }


    useEffect(
        () => {

            restoreAuthSession();

        },
        []
    );


    // ========================================
    // LOAD SAVED CHATS
    // ========================================

    async function loadChats() {

        try {

            const response =
                await authFetch(
                    `${API_BASE_URL}/chats`
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    `Chat list error: ${
                        response.status
                    }`
                );
            }


            const data =
                await response
                    .json();


            setChats(
                Array.isArray(
                    data.chats
                )
                    ? data.chats
                    : []
            );

        }

        catch (error) {

            console.error(
                'Could not load chats:',
                error
            );
        }
    }


    // ========================================
    // LOAD PROJECTS
    // ========================================

    async function loadProjects() {

        try {

            const response =
                await authFetch(
                    `${API_BASE_URL}/projects`
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    `Project list error: ${
                        response.status
                    }`
                );
            }


            const data =
                await response
                    .json();


            setProjects(
                Array.isArray(
                    data.projects
                )
                    ? data.projects
                    : []
            );

        }

        catch (error) {

            console.error(
                'Could not load projects:',
                error
            );
        }
    }


    // ========================================
    // LOAD PROJECT CHATS
    // ========================================

    async function loadProjectChats(
        projectId
    ) {

        if (!projectId) {

            setProjectChats(
                []
            );

            return [];
        }


        try {

            const response =
                await authFetch(
                    `${API_BASE_URL}/projects/${
                        encodeURIComponent(
                            projectId
                        )
                    }/chats`
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    `Project chat list error: ${
                        response.status
                    }`
                );
            }


            const data =
                await response
                    .json();


            const nextChats =
                Array.isArray(
                    data.chats
                )
                    ? data.chats
                    : [];


            setProjectChats(
                nextChats
            );


            return nextChats;

        }

        catch (error) {

            console.error(
                'Could not load project chats:',
                error
            );


            setProjectChats(
                []
            );


            return [];
        }
    }


    // ========================================
    // LOAD SIDEBAR DATA ON START
    // ========================================

    useEffect(
        () => {

            if (
                !currentUser
                ||
                !authToken
            ) {

                setChats(
                    []
                );


                setProjects(
                    []
                );


                return;
            }


            loadChats();
            loadProjects();

        },
        [
            currentUser
                ?.id,

            authToken,
        ]
    );


    // ========================================
    // CLOSE POPOVER MENUS
    // ========================================

    useEffect(
        () => {

            function handleClickOutside(
                event
            ) {

                if (
                    attachMenuOpen
                    &&
                    attachAreaRef.current
                    &&
                    !attachAreaRef
                        .current
                        .contains(
                            event.target
                        )
                ) {

                    setAttachMenuOpen(
                        false
                    );
                }


                if (
                    modelMenuOpen
                    &&
                    modelAreaRef.current
                    &&
                    !modelAreaRef
                        .current
                        .contains(
                            event.target
                        )
                ) {

                    setModelMenuOpen(
                        false
                    );
                }
            }


            document.addEventListener(
                'mousedown',
                handleClickOutside
            );


            return () => {

                document.removeEventListener(
                    'mousedown',
                    handleClickOutside
                );
            };

        },
        [
            attachMenuOpen,
            modelMenuOpen,
        ]
    );


    // ========================================
    // KEEP INPUT FOCUSED
    // ========================================

    useEffect(
        () => {

            requestAnimationFrame(
                () => {

                    messageInputRef
                        .current
                        ?.focus();
                }
            );

        },
        [
            messages.length,
        ]
    );


    // ========================================
    // AUTO-GROW TEXTAREA
    // ========================================

    useEffect(
        () => {

            const textarea =
                messageInputRef
                    .current;


            if (!textarea) {
                return;
            }


            textarea.style.height =
                'auto';


            const newHeight =
                Math.min(
                    Math.max(
                        textarea
                            .scrollHeight,
                        52
                    ),
                    160
                );


            textarea.style.height =
                `${newHeight}px`;

        },
        [
            input,
            messages.length,
        ]
    );


    // ========================================
    // SMART AUTO-SCROLL
    // ========================================

    function stopPendingAutoScrollFrame() {

        if (
            autoScrollFrameRef
                .current ===
            null
        ) {
            return;
        }


        cancelAnimationFrame(
            autoScrollFrameRef
                .current
        );


        autoScrollFrameRef
            .current =
                null;
    }


    function handleMessagesWheel(
        event
    ) {

        if (
            event.deltaY < 0
        ) {

            autoScrollEnabledRef
                .current =
                    false;


            stopPendingAutoScrollFrame();
        }
    }


    function handleMessagesScroll() {

        const container =
            messagesContainerRef
                .current;


        if (!container) {
            return;
        }


        const currentScrollTop =
            container.scrollTop;


        const isScrollingUp =
            currentScrollTop <
            lastScrollTopRef
                .current;


        const distanceFromBottom =
            container.scrollHeight
            -
            currentScrollTop
            -
            container.clientHeight;


        if (isScrollingUp) {

            autoScrollEnabledRef
                .current =
                    false;


            stopPendingAutoScrollFrame();
        }

        else if (
            distanceFromBottom <
            24
        ) {

            autoScrollEnabledRef
                .current =
                    true;
        }


        lastScrollTopRef
            .current =
                currentScrollTop;


        updateActiveConversationTopic(
            container
        );
    }


    function updateActiveConversationTopic(
        container =
            messagesContainerRef.current
    ) {

        if (
            !container
            ||
            conversationTopics.length ===
                0
        ) {
            return;
        }


        const containerTop =
            container
                .getBoundingClientRect()
                .top;


        const activationLine =
            containerTop +
            Math.min(
                150,
                container.clientHeight * 0.28
            );


        let nextActiveTopic =
            conversationTopics[0];


        for (
            const topic of
            conversationTopics
        ) {

            const element =
                document
                    .getElementById(
                        `message-${topic.messageId}`
                    );


            if (!element) {
                continue;
            }


            if (
                element
                    .getBoundingClientRect()
                    .top <=
                activationLine
            ) {

                nextActiveTopic =
                    topic;
            }

            else {
                break;
            }
        }


        setActiveTopicMessageId(
            (currentTopicId) =>
                currentTopicId ===
                    nextActiveTopic.messageId

                    ? currentTopicId

                    : nextActiveTopic.messageId
        );
    }


    function scrollToConversationTopic(
        messageId
    ) {

        const container =
            messagesContainerRef
                .current;


        const target =
            document
                .getElementById(
                    `message-${messageId}`
                );


        if (
            !container
            ||
            !target
        ) {
            return;
        }


        autoScrollEnabledRef
            .current =
                false;


        stopPendingAutoScrollFrame();


        const containerRect =
            container
                .getBoundingClientRect();


        const targetRect =
            target
                .getBoundingClientRect();


        const targetScrollTop =
            container.scrollTop
            +
            targetRect.top
            -
            containerRect.top
            -
            24;


        setActiveTopicMessageId(
            messageId
        );


        container.scrollTo({
            top:
                Math.max(
                    0,
                    targetScrollTop
                ),

            behavior:
                'smooth',
        });
    }


    useEffect(
        () => {

            if (
                conversationTopics.length ===
                0
            ) {

                setActiveTopicMessageId(
                    null
                );

                return;
            }


            const activeTopicStillExists =
                conversationTopics
                    .some(
                        (topic) =>
                            topic.messageId ===
                            activeTopicMessageId
                    );


            if (
                !activeTopicStillExists
            ) {

                setActiveTopicMessageId(
                    conversationTopics[0]
                        .messageId
                );
            }

        },
        [
            messages,
        ]
    );


    useEffect(
        () => {

            if (
                !autoScrollEnabledRef
                    .current
            ) {
                return;
            }


            stopPendingAutoScrollFrame();


            autoScrollFrameRef
                .current =
                    requestAnimationFrame(
                        () => {

                            autoScrollFrameRef
                                .current =
                                    null;


                            const container =
                                messagesContainerRef
                                    .current;


                            if (
                                !container
                                ||
                                !autoScrollEnabledRef
                                    .current
                            ) {
                                return;
                            }


                            container.scrollTop =
                                container
                                    .scrollHeight;


                            lastScrollTopRef
                                .current =
                                    container
                                        .scrollTop;


                            updateActiveConversationTopic(
                                container
                            );
                        }
                    );


            return () => {

                stopPendingAutoScrollFrame();
            };

        },
        [
            messages,
        ]
    );


    // ========================================
    // STOP GENERATION
    // ========================================

    function stopGeneration() {

        if (
            abortControllerRef
                .current
        ) {

            abortControllerRef
                .current
                .abort();
        }
    }


    async function stopGenerationAndWait() {

        if (
            !abortControllerRef
                .current
        ) {
            return;
        }


        abortControllerRef
            .current
            .abort();


        await Promise.race([
            streamDoneRef.current,

            new Promise(
                (
                    resolve
                ) => {

                    window.setTimeout(
                        resolve,
                        5000
                    );
                }
            ),
        ]);
    }


    // ========================================
    // ADD TOOL EVENT
    // ========================================

    function addToolToMessage(
        assistantMessageId,
        toolName
    ) {

        if (!toolName) {
            return;
        }


        setMessages(
            (
                currentMessages
            ) =>
                currentMessages.map(
                    (
                        message
                    ) => {

                        if (
                            message.id !==
                            assistantMessageId
                        ) {
                            return message;
                        }


                        const currentTools =
                            message.tools
                            ||
                            [];


                        if (
                            currentTools
                                .includes(
                                    toolName
                                )
                        ) {
                            return message;
                        }


                        return {
                            ...message,

                            tools: [
                                ...currentTools,
                                toolName,
                            ],
                        };
                    }
                )
        );
    }


    // ========================================
    // ADD GENERATED FILE EVENT
    // ========================================

    function addGeneratedFileToMessage(
        assistantMessageId,
        fileData
    ) {

        if (
            !fileData
            ||
            !fileData.file_id
        ) {
            return;
        }


        setMessages(
            (
                currentMessages
            ) =>
                currentMessages.map(
                    (
                        message
                    ) => {

                        if (
                            message.id !==
                            assistantMessageId
                        ) {
                            return message;
                        }


                        const currentFiles =
                            message.files
                            ||
                            [];


                        const alreadyExists =
                            currentFiles.some(
                                (
                                    file
                                ) =>
                                    file.file_id ===
                                    fileData.file_id
                            );


                        if (
                            alreadyExists
                        ) {
                            return message;
                        }


                        return {
                            ...message,

                            files: [
                                ...currentFiles,

                                {
                                    file_id:
                                        fileData.file_id,

                                    filename:
                                        fileData.filename,

                                    extension:
                                        fileData.extension,

                                    size:
                                        fileData.size,
                                },
                            ],
                        };
                    }
                )
        );
    }


    // ========================================
    // ADD TOKEN
    // ========================================

    function addTokenToMessage(
        assistantMessageId,
        token
    ) {

        if (!token) {
            return;
        }


        setMessages(
            (
                currentMessages
            ) =>
                currentMessages.map(
                    (
                        message
                    ) =>
                        message.id ===
                            assistantMessageId

                            ? {
                                ...message,

                                isThinking:
                                    false,

                                text:
                                    message.text
                                    +
                                    token,
                            }

                            : message
                )
        );
    }


    // ========================================
    // MODEL FIT HINT
    // ========================================

    function setModelHintForMessage(
        assistantMessageId,
        hint
    ) {

        if (
            !hint
            ||
            !hint.message
            ||
            !hint.recommended_model
        ) {
            return;
        }


        setMessages(
            (
                currentMessages
            ) =>
                currentMessages.map(
                    (
                        message
                    ) =>
                        message.id ===
                            assistantMessageId

                            ? {
                                ...message,

                                modelHint: {
                                    message:
                                        hint.message,

                                    recommendedModel:
                                        hint.recommended_model,
                                },
                            }

                            : message
                )
        );
    }


    // ========================================
    // FINISH RESPONSE
    // ========================================

    function finishAssistantMessage(
        assistantMessageId
    ) {

        setMessages(
            (
                currentMessages
            ) =>
                currentMessages.map(
                    (
                        message
                    ) =>
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
        );
    }


    // ========================================
    // PROCESS STREAM EVENT
    // ========================================

    function processStreamEvent(
        event,
        assistantMessageId
    ) {

        if (
            !event
            ||
            !event.type
        ) {
            return;
        }


        if (
            event.type ===
            'tool'
        ) {

            addToolToMessage(
                assistantMessageId,
                event.name
            );

            return;
        }


        if (
            event.type ===
            'file'
        ) {

            addGeneratedFileToMessage(
                assistantMessageId,
                event
            );

            return;
        }


        if (
            event.type ===
            'token'
        ) {

            addTokenToMessage(
                assistantMessageId,
                event.content
            );

            return;
        }


        if (
            event.type ===
            'model_hint'
        ) {

            setModelHintForMessage(
                assistantMessageId,
                event
            );

            return;
        }


        if (
            event.type ===
            'error'
        ) {

            const errorMessage =
                (
                    typeof event.message ===
                        'string'
                    &&
                    event.message.trim()
                )

                    ? event.message.trim()

                    : (
                        'ChatOmni could not complete '
                        +
                        'the response. Please try again.'
                    );


            setMessages(
                (
                    currentMessages
                ) =>
                    currentMessages.map(
                        (
                            message
                        ) => {

                            if (
                                message.id !==
                                assistantMessageId
                            ) {
                                return message;
                            }


                            const existingText =
                                (
                                    message.text
                                    ||
                                    ''
                                ).trim();


                            return {
                                ...message,

                                isThinking:
                                    false,

                                isComplete:
                                    true,

                                text:
                                    existingText

                                        ? (
                                            `${message.text}\n\n`
                                            +
                                            errorMessage
                                        )

                                        : errorMessage,
                            };
                        }
                    )
            );

            return;
        }


        if (
            event.type ===
            'done'
        ) {

            finishAssistantMessage(
                assistantMessageId
            );
        }
    }


    // ========================================
    // SEND MESSAGE
    // ========================================

    async function sendMessage() {

        const typedMessage =
            input.trim();


        if (isStreaming) {
            return;
        }


        if (
            typedMessage ===
                ''
            &&
            !selectedFile
            &&
            selectedImages.length ===
                0
        ) {
            return;
        }


        autoScrollEnabledRef
            .current =
                true;


        setActiveChat(
            chatId
        );


        const attachment =
            selectedFile;


        const imageAttachments = [
            ...selectedImages,
        ];


        const requestModel =
            selectedModel;


        const messageText =
            typedMessage
            ||
            (
                imageAttachments.length >
                    0

                    ? (
                        imageAttachments.length >
                            1

                            ? 'Analyze these images in the order they were uploaded and explain the important points.'

                            : 'Analyze this image and explain the important points.'
                    )

                    : attachment
                        ?.category ===
                        'pdf'

                        ? 'Briefly summarize this PDF.'

                        : attachment
                            ?.category ===
                            'document'

                            ? 'Briefly summarize this document.'

                            : attachment
                                ?.category ===
                                'code'

                                ? 'Review this file and explain the important points.'

                                : ''
            );


        const backendMessage =
            attachment
                ?.category ===
                'pdf'

                ? (
                    `[A PDF named "${attachment.name}" has just been uploaded `
                    +
                    `and loaded as the active PDF document. `
                    +
                    `The user's message refers to this PDF.] ${messageText}`
                )

                : imageAttachments.length >
                    1

                    ? (
                        `[The user uploaded ${imageAttachments.length} images. `
                        +
                        `Analyze them in the exact order they were uploaded: `
                        +
                        `${imageAttachments
                            .map(
                                (
                                    image,
                                    index
                                ) =>
                                    `${index + 1}. ${image.name}`
                            )
                            .join(', ')}.] ${messageText}`
                    )

                    : messageText;


        const userMessageId =
            Date.now();


        const assistantMessageId =
            userMessageId + 1;


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

            attachments:
                imageAttachments.map(
                    (
                        image,
                        index
                    ) => ({
                        name:
                            image.name,

                        type:
                            image.type,

                        category:
                            'image',

                        order:
                            index + 1,
                    })
                ),
        };


        const assistantMessage = {

            id:
                assistantMessageId,

            text:
                '',

            sender:
                'assistant',

            tools:
                [],

            files:
                [],

            model:
                requestModel,

            modelHint:
                null,

            isThinking:
                true,

            isComplete:
                false,
        };


        setMessages(
            (
                currentMessages
            ) => [
                ...currentMessages,
                userMessage,
                assistantMessage,
            ]
        );


        setInput(
            ''
        );

        setSelectedFile(
            null
        );

        setSelectedImages(
            []
        );

        setAttachMenuOpen(
            false
        );

        setIsStreaming(
            true
        );


        const controller =
            new AbortController();


        abortControllerRef
            .current =
                controller;


        let resolveStreamDone;


        const streamDonePromise =
            new Promise(
                (
                    resolve
                ) => {

                    resolveStreamDone =
                        resolve;
                }
            );


        streamDoneRef
            .current =
                streamDonePromise;


        let responseStartTimeoutId =
            null;


        let streamReader =
            null;


        let timeoutErrorMessage =
            '';


        try {

            const imageIds =
                [];

            let codeId =
                null;


            // ========================================
            // PDF UPLOAD
            // ========================================

            if (
                attachment
                    ?.category ===
                'pdf'
            ) {

                const formData =
                    new FormData();


                formData.append(
                    'file',
                    attachment.file
                );


                const uploadResponse =
                    await authFetch(
                        `${API_BASE_URL}/upload-pdf`,

                        {
                            method:
                                'POST',

                            body:
                                formData,

                            signal:
                                controller.signal,
                        }
                    );


                if (
                    !uploadResponse.ok
                ) {

                    let errorMessage =
                        `PDF upload failed: ${
                            uploadResponse.status
                        }`;


                    try {

                        const errorData =
                            await uploadResponse
                                .json();


                        if (
                            errorData
                                ?.detail
                        ) {

                            errorMessage =
                                `PDF upload failed: ${
                                    errorData.detail
                                }`;
                        }

                    }

                    catch {

                        // Keep default message.
                    }


                    throw new Error(
                        errorMessage
                    );
                }
            }


            // ========================================
            // DOCX UPLOAD
            // ========================================

            if (
                attachment
                    ?.category ===
                'document'
            ) {

                const formData =
                    new FormData();


                formData.append(
                    'file',
                    attachment.file
                );


                const uploadResponse =
                    await authFetch(
                        `${API_BASE_URL}/upload-document`,

                        {
                            method:
                                'POST',

                            body:
                                formData,

                            signal:
                                controller.signal,
                        }
                    );


                if (
                    !uploadResponse.ok
                ) {

                    let errorMessage =
                        `Document upload failed: ${
                            uploadResponse.status
                        }`;


                    try {

                        const errorData =
                            await uploadResponse
                                .json();


                        if (
                            errorData
                                ?.detail
                        ) {

                            errorMessage =
                                `Document upload failed: ${
                                    errorData.detail
                                }`;
                        }

                    }

                    catch {

                        // Keep default message.
                    }


                    throw new Error(
                        errorMessage
                    );
                }


                const uploadData =
                    await uploadResponse
                        .json();


                codeId =
                    uploadData
                        .code_id;


                if (!codeId) {

                    throw new Error(
                        'Document upload failed: backend did not return a file ID.'
                    );
                }
            }


            // ========================================
            // IMAGE UPLOAD
            // ========================================

            for (
                const imageAttachment of
                imageAttachments
            ) {

                const formData =
                    new FormData();


                formData.append(
                    'file',
                    imageAttachment.file
                );


                const uploadResponse =
                    await authFetch(
                        `${API_BASE_URL}/upload-image`,

                        {
                            method:
                                'POST',

                            body:
                                formData,

                            signal:
                                controller.signal,
                        }
                    );


                if (
                    !uploadResponse.ok
                ) {

                    let errorMessage =
                        `Image upload failed: ${
                            uploadResponse.status
                        }`;


                    try {

                        const errorData =
                            await uploadResponse
                                .json();


                        if (
                            errorData
                                ?.detail
                        ) {

                            errorMessage =
                                `Image upload failed: ${
                                    errorData.detail
                                }`;
                        }

                    }

                    catch {

                        // Keep default message.
                    }


                    throw new Error(
                        errorMessage
                    );
                }


                const uploadData =
                    await uploadResponse
                        .json();


                const imageId =
                    uploadData
                        .image_id;


                if (!imageId) {

                    throw new Error(
                        'Image upload failed: backend did not return an image ID.'
                    );
                }


                imageIds.push(
                    imageId
                );
            }


            // ========================================
            // CODE / TEXT UPLOAD
            // ========================================

            if (
                attachment
                    ?.category ===
                'code'
            ) {

                const formData =
                    new FormData();


                formData.append(
                    'file',
                    attachment.file
                );


                const uploadResponse =
                    await authFetch(
                        `${API_BASE_URL}/upload-code`,

                        {
                            method:
                                'POST',

                            body:
                                formData,

                            signal:
                                controller.signal,
                        }
                    );


                if (
                    !uploadResponse.ok
                ) {

                    let errorMessage =
                        `Code upload failed: ${
                            uploadResponse.status
                        }`;


                    try {

                        const errorData =
                            await uploadResponse
                                .json();


                        if (
                            errorData
                                ?.detail
                        ) {

                            errorMessage =
                                `Code upload failed: ${
                                    errorData.detail
                                }`;
                        }

                    }

                    catch {

                        // Keep default message.
                    }


                    throw new Error(
                        errorMessage
                    );
                }


                const uploadData =
                    await uploadResponse
                        .json();


                codeId =
                    uploadData
                        .code_id;


                if (!codeId) {

                    throw new Error(
                        'Code upload failed: backend did not return a code ID.'
                    );
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

                project_id:
                    activeProject
                        ?.project_id
                    ||
                    null,

                model:
                    requestModel,
            };


            if (
                imageIds.length ===
                1
            ) {

                requestBody.image_id =
                    imageIds[0];
            }

            else if (
                imageIds.length >
                1
            ) {

                requestBody.image_ids =
                    imageIds;
            }


            if (codeId) {

                requestBody.code_id =
                    codeId;
            }


            responseStartTimeoutId =
                window.setTimeout(
                    () => {

                        timeoutErrorMessage =
                            'ChatOmni did not start the response in time. Please try again.';


                        controller.abort();
                    },
                    CHAT_RESPONSE_START_TIMEOUT_MS
                );


            const response =
                await authFetch(
                    `${API_BASE_URL}/chat/stream`,

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
                );


            if (
                responseStartTimeoutId !==
                null
            ) {

                window.clearTimeout(
                    responseStartTimeoutId
                );


                responseStartTimeoutId =
                    null;
            }


            if (
                !response.ok
            ) {

                let errorMessage =
                    `HTTP error: ${
                        response.status
                    }`;


                try {

                    const errorData =
                        await response
                            .json();


                    if (
                        errorData
                            ?.detail
                    ) {

                        errorMessage =
                            errorData.detail;
                    }

                }

                catch {

                    // Keep default message.
                }


                throw new Error(
                    errorMessage
                );
            }


            if (
                !response.body
            ) {

                throw new Error(
                    'Streaming response body is missing.'
                );
            }


            streamReader =
                response.body
                    .getReader();


            const decoder =
                new TextDecoder();


            let buffer =
                '';


            let receivedStreamEvent =
                false;


            let streamCompleted =
                false;


            while (true) {

                const {
                    value,
                    done,
                } =
                    await readStreamChunkWithTimeout(
                        streamReader,
                        receivedStreamEvent
                            ? CHAT_STREAM_IDLE_TIMEOUT_MS
                            : CHAT_RESPONSE_START_TIMEOUT_MS
                    );


                if (done) {
                    break;
                }


                buffer +=
                    decoder.decode(
                        value,

                        {
                            stream:
                                true,
                        }
                    );


                const lines =
                    buffer.split(
                        '\n'
                    );


                buffer =
                    lines.pop()
                    ||
                    '';


                for (
                    const line
                    of lines
                ) {

                    const trimmedLine =
                        line.trim();


                    if (
                        !trimmedLine
                    ) {
                        continue;
                    }


                    try {

                        const event =
                            JSON.parse(
                                trimmedLine
                            );


                        receivedStreamEvent =
                            true;


                        if (
                            event.type ===
                                'done'
                            ||
                            event.type ===
                                'error'
                        ) {

                            streamCompleted =
                                true;
                        }


                        processStreamEvent(
                            event,
                            assistantMessageId
                        );

                    }

                    catch (error) {

                        console.error(
                            'Stream JSON parse error:',
                            trimmedLine,
                            error
                        );
                    }
                }
            }


            buffer +=
                decoder.decode();


            const finalLine =
                buffer.trim();


            if (finalLine) {

                try {

                    const event =
                        JSON.parse(
                            finalLine
                        );


                    receivedStreamEvent =
                        true;


                    if (
                        event.type ===
                            'done'
                        ||
                        event.type ===
                            'error'
                    ) {

                        streamCompleted =
                            true;
                    }


                    processStreamEvent(
                        event,
                        assistantMessageId
                    );

                }

                catch (error) {

                    console.error(
                        'Final stream JSON parse error:',
                        finalLine,
                        error
                    );
                }
            }


            if (
                !receivedStreamEvent
            ) {

                throw new Error(
                    'ChatOmni returned an empty response. Please try again.'
                );
            }


            if (
                !streamCompleted
            ) {

                throw new Error(
                    'The response stream ended before completion. Please try again.'
                );
            }


            finishAssistantMessage(
                assistantMessageId
            );

        }

        catch (error) {

            const isStreamTimeout =
                error.name ===
                'StreamTimeoutError';


            if (isStreamTimeout) {

                timeoutErrorMessage =
                    error.message
                    ||
                    'The response timed out. Please try again.';


                controller.abort();
            }


            const didTimeout =
                isStreamTimeout
                ||
                Boolean(
                    timeoutErrorMessage
                );


            if (
                didTimeout
                &&
                streamReader
            ) {

                try {

                    await streamReader
                        .cancel();

                }

                catch {

                    // The aborted stream may already be closed.
                }
            }


            if (didTimeout) {

                setMessages(
                    (
                        currentMessages
                    ) =>
                        currentMessages.map(
                            (
                                message
                            ) =>
                                message.id ===
                                    assistantMessageId

                                    ? {
                                        ...message,

                                        isThinking:
                                            false,

                                        isComplete:
                                            true,

                                        text:
                                            message.text
                                            ||
                                            timeoutErrorMessage
                                            ||
                                            error.message
                                            ||
                                            'The response timed out. Please try again.',
                                    }

                                    : message
                        )
                );

            }

            else if (
                error.name ===
                'AbortError'
            ) {

                setMessages(
                    (
                        currentMessages
                    ) =>
                        currentMessages.map(
                            (
                                message
                            ) => {

                                if (
                                    message.id !==
                                    assistantMessageId
                                ) {
                                    return message;
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
                                            'Response stopped.',
                                    };
                                }


                                return {
                                    ...message,

                                    isThinking:
                                        false,

                                    isComplete:
                                        true,
                                };
                            }
                        )
                );

            }

            else {

                console.error(
                    'ChatOmni backend error:',
                    error
                );


                const errorMessage =
                    error
                        ?.message
                        ?.trim()
                    ||
                    '';


                const isUploadError =
                    errorMessage
                        .startsWith(
                            'PDF upload failed:'
                        )
                    ||
                    errorMessage
                        .startsWith(
                            'Document upload failed:'
                        )
                    ||
                    errorMessage
                        .startsWith(
                            'Image upload failed:'
                        )
                    ||
                    errorMessage
                        .startsWith(
                            'Code upload failed:'
                        );


                const isNetworkError =
                    error instanceof TypeError
                    &&
                    (
                        errorMessage ===
                            ''
                        ||
                        errorMessage ===
                            'Failed to fetch'
                        ||
                        errorMessage ===
                            'Load failed'
                        ||
                        errorMessage.includes(
                            'NetworkError'
                        )
                    );


                const userFacingError =
                    isUploadError

                        ? errorMessage

                        : isNetworkError

                            ? 'ChatOmni backend could not be reached.'

                            : errorMessage
                                ||
                                'ChatOmni backend could not be reached.';


                setMessages(
                    (
                        currentMessages
                    ) =>
                        currentMessages.map(
                            (
                                message
                            ) =>
                                message.id ===
                                    assistantMessageId

                                    ? {
                                        ...message,

                                        isThinking:
                                            false,

                                        isComplete:
                                            true,

                                        text:
                                            message.text
                                            ||
                                            userFacingError,
                                    }

                                    : message
                        )
                );
            }
        }

        finally {

            if (
                responseStartTimeoutId !==
                null
            ) {

                window.clearTimeout(
                    responseStartTimeoutId
                );
            }


            if (
                abortControllerRef.current ===
                controller
            ) {

                abortControllerRef
                    .current =
                        null;
            }


            setIsStreaming(
                false
            );


            if (resolveStreamDone) {

                resolveStreamDone();
            }


            if (
                streamDoneRef.current ===
                streamDonePromise
            ) {

                streamDoneRef.current =
                    Promise.resolve();
            }


            await loadChats();


            if (
                activeProject
                    ?.project_id
            ) {

                await loadProjectChats(
                    activeProject
                        .project_id
                );
            }


            requestAnimationFrame(
                () => {

                    messageInputRef
                        .current
                        ?.focus();
                }
            );
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
                'Enter'
            &&
            !event.shiftKey
        ) {

            event.preventDefault();


            if (
                !isStreaming
            ) {

                sendMessage();
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
        );
    }


    // ========================================
    // ATTACHMENT MENU
    // ========================================

    function toggleAttachMenu() {

        setModelMenuOpen(
            false
        );


        setAttachMenuOpen(
            (
                current
            ) =>
                !current
        );
    }


    function chooseFile() {

        setAttachMenuOpen(
            false
        );


        fileInputRef
            .current
            ?.click();
    }


    function chooseImage() {

        setAttachMenuOpen(
            false
        );


        imageInputRef
            .current
            ?.click();
    }


    // ========================================
    // FILE SELECT
    // ========================================

    function handleFileChange(
        event
    ) {

        const file =
            event.target
                .files[0];


        if (!file) {

            event.target.value =
                '';

            return;
        }


        const lowerName =
            file.name
                .toLowerCase();


        if (
            lowerName.endsWith(
                '.pdf'
            )
        ) {

            setSelectedImages(
                []
            );


            setSelectedFile({
                file,

                name:
                    file.name,

                type:
                    file.type
                    ||
                    'application/pdf',

                category:
                    'pdf',
            });


            event.target.value =
                '';

            return;
        }


        if (
            lowerName.endsWith(
                '.docx'
            )
        ) {

            if (
                file.size >
                10 * 1024 * 1024
            ) {

                alert(
                    'DOCX file is too large. Maximum size is 10 MB.'
                );


                event.target.value =
                    '';

                return;
            }


            setSelectedImages(
                []
            );


            setSelectedFile({
                file,

                name:
                    file.name,

                type:
                    file.type
                    ||
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

                category:
                    'document',
            });


            event.target.value =
                '';

            return;
        }


        const isSupportedTextFile =
            SUPPORTED_TEXT_FILE_EXTENSIONS
                .some(
                    (
                        extension
                    ) =>
                        lowerName
                            .endsWith(
                                extension
                            )
                );


        if (
            !isSupportedTextFile
        ) {

            alert(
                'This file format is not supported yet. Use PDF, DOCX, or a common text/code file such as TXT, MD, CSV, JSON, XML, YAML, HTML, CSS, JS, JSX, TS, TSX, Python, Java, C/C++, C#, Go, Rust, SQL, Shell, Vue, Svelte, and similar text-based formats.'
            );


            event.target.value =
                '';

            return;
        }


        if (
            file.size >
            200 * 1024
        ) {

            alert(
                'Text/code file is too large. Maximum size is 200 KB.'
            );


            event.target.value =
                '';

            return;
        }


        setSelectedImages(
            []
        );


        setSelectedFile({
            file,

            name:
                file.name,

            type:
                file.type
                ||
                'text/plain',

            category:
                'code',
        });


        event.target.value =
            '';
    }


    // ========================================
    // IMAGE SELECT
    // ========================================

    function handleImageChange(
        event
    ) {

        const files =
            Array.from(
                event.target
                    .files
                ||
                []
            );


        if (
            files.length ===
            0
        ) {

            event.target.value =
                '';

            return;
        }


        const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/webp',
        ];


        const unsupportedFile =
            files.find(
                (file) =>
                    !allowedTypes
                        .includes(
                            file.type
                        )
            );


        if (unsupportedFile) {

            alert(
                'Supported image formats are PNG, JPG, JPEG, and WEBP.'
            );


            event.target.value =
                '';

            return;
        }


        const nextImages =
            files.map(
                (file) => ({
                    clientId:
                        createClientId(),

                    file,

                    name:
                        file.name,

                    type:
                        file.type,

                    category:
                        'image',
                })
            );


        setSelectedFile(
            null
        );


        setSelectedImages(
            (
                currentImages
            ) => [
                ...currentImages,
                ...nextImages,
            ]
        );


        event.target.value =
            '';
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
                ?.items;


        if (!clipboardItems) {
            return;
        }


        const imageItems =
            Array
                .from(
                    clipboardItems
                )
                .filter(
                    (
                        item
                    ) =>
                        item.type
                            .startsWith(
                                'image/'
                            )
                );


        if (
            imageItems.length ===
            0
        ) {
            return;
        }


        const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/webp',
        ];


        const imageFiles =
            imageItems
                .map(
                    (
                        imageItem
                    ) =>
                        imageItem
                            .getAsFile()
                )
                .filter(
                    Boolean
                );


        if (
            imageFiles.length ===
            0
        ) {
            return;
        }


        const unsupportedImage =
            imageFiles.find(
                (
                    imageFile
                ) =>
                    !allowedTypes
                        .includes(
                            imageFile.type
                        )
            );


        if (unsupportedImage) {

            alert(
                'Pasted image format is not supported. Use PNG, JPG, JPEG, or WEBP.'
            );

            return;
        }


        event.preventDefault();


        const timestamp =
            Date.now();


        const nextImages =
            imageFiles.map(
                (
                    imageBlob,
                    index
                ) => {

                    let extension =
                        'png';


                    if (
                        imageBlob.type ===
                        'image/jpeg'
                    ) {

                        extension =
                            'jpg';
                    }

                    else if (
                        imageBlob.type ===
                        'image/webp'
                    ) {

                        extension =
                            'webp';
                    }


                    const screenshotFile =
                        new File(
                            [
                                imageBlob,
                            ],

                            `screenshot-${timestamp}-${index + 1}.${extension}`,

                            {
                                type:
                                    imageBlob.type,
                            }
                        );


                    return {
                        clientId:
                            createClientId(),

                        file:
                            screenshotFile,

                        name:
                            screenshotFile.name,

                        type:
                            screenshotFile.type,

                        category:
                            'image',
                    };
                }
            );


        setSelectedFile(
            null
        );


        setSelectedImages(
            (
                currentImages
            ) => [
                ...currentImages,
                ...nextImages,
            ]
        );


        setAttachMenuOpen(
            false
        );
    }


    // ========================================
    // REMOVE ATTACHMENT
    // ========================================

    function removeSelectedFile() {

        setSelectedFile(
            null
        );


        requestAnimationFrame(
            () => {

                messageInputRef
                    .current
                    ?.focus();
            }
        );
    }


    function removeSelectedImage(
        imageIndex
    ) {

        setSelectedImages(
            (
                currentImages
            ) =>
                currentImages.filter(
                    (
                        _,
                        index
                    ) =>
                        index !==
                        imageIndex
                )
        );


        requestAnimationFrame(
            () => {

                messageInputRef
                    .current
                    ?.focus();
            }
        );
    }


    // ========================================
    // NEW CHAT
    // ========================================

    function startNewChat() {

        if (isStreaming) {

            stopGeneration();
        }


        const newChatId =
            createClientId();


        setChatId(
            newChatId
        );


        setActiveChat(
            null
        );


        setActiveProject(
            null
        );


        setExpandedProjectId(
            null
        );


        setProjectChats(
            []
        );


        setMessages(
            []
        );


        setInput(
            ''
        );


        setSelectedFile(
            null
        );


        setSelectedImages(
            []
        );


        setAttachMenuOpen(
            false
        );


        setModelMenuOpen(
            false
        );


        setSelectedModel(
            'luna'
        );


        autoScrollEnabledRef
            .current =
                true;


        requestAnimationFrame(
            () => {

                messageInputRef
                    .current
                    ?.focus();
            }
        );
    }


    // ========================================
    // NEW PROJECT CHAT
    // ========================================

    function startNewProjectChat(
        project = activeProject
    ) {

        if (
            !project
                ?.project_id
        ) {
            return;
        }


        if (isStreaming) {

            stopGeneration();
        }


        const newChatId =
            createClientId();


        setActiveProject(
            project
        );


        setExpandedProjectId(
            project.project_id
        );


        setChatId(
            newChatId
        );


        setActiveChat(
            null
        );


        setMessages(
            []
        );


        setInput(
            ''
        );


        setSelectedFile(
            null
        );


        setSelectedImages(
            []
        );


        setAttachMenuOpen(
            false
        );


        setModelMenuOpen(
            false
        );


        setSelectedModel(
            'luna'
        );


        autoScrollEnabledRef
            .current =
                true;


        requestAnimationFrame(
            () => {

                messageInputRef
                    .current
                    ?.focus();
            }
        );
    }


    // ========================================
    // SELECT PROJECT
    // ========================================

    async function selectProject(
        project
    ) {

        if (
            !project
                ?.project_id
        ) {
            return;
        }


        if (isStreaming) {

            await stopGenerationAndWait();
        }


        const projectId =
            project.project_id;


        if (
            expandedProjectId ===
            projectId
        ) {

            setExpandedProjectId(
                null
            );


            setProjectChats(
                []
            );


            return;
        }


        setExpandedProjectId(
            projectId
        );


        setProjectChats(
            []
        );


        await loadProjectChats(
            projectId
        );
    }


    // ========================================
    // NEW PROJECT ZIP PICKER
    // ========================================

    async function chooseProjectZip() {

        if (
            isCreatingProject
        ) {
            return;
        }


        if (isStreaming) {

            await stopGenerationAndWait();
        }


        projectZipInputRef
            .current
            ?.click();
    }


    // ========================================
    // CREATE PROJECT FROM ZIP
    // ========================================

    async function handleProjectZipChange(
        event
    ) {

        const zipFile =
            event.target
                .files
                ?.[0];


        event.target.value =
            '';


        if (!zipFile) {
            return;
        }


        const defaultName =
            zipFile.name
                .replace(
                    /\.zip$/i,
                    ''
                )
                .trim()
            ||
            'Untitled Project';


        const projectName =
            window.prompt(
                'Project name:',
                defaultName
            );


        if (
            projectName ===
            null
        ) {
            return;
        }


        const cleanName =
            projectName
                .trim();


        if (!cleanName) {

            alert(
                'Project name cannot be empty.'
            );

            return;
        }


        setIsCreatingProject(
            true
        );


        try {

            const createResponse =
                await authFetch(
                    `${API_BASE_URL}/projects`,

                    {
                        method:
                            'POST',

                        headers: {
                            'Content-Type':
                                'application/json',
                        },

                        body:
                            JSON.stringify({
                                name:
                                    cleanName,
                            }),
                    }
                );


            if (
                !createResponse.ok
            ) {

                let errorMessage =
                    `Project creation failed: ${
                        createResponse.status
                    }`;


                try {

                    const errorData =
                        await createResponse
                            .json();


                    if (
                        errorData
                            ?.detail
                    ) {

                        errorMessage =
                            errorData.detail;
                    }

                }

                catch {

                    // Keep default message.
                }


                throw new Error(
                    errorMessage
                );
            }


            const createData =
                await createResponse
                    .json();


            const project =
                createData.project;


            if (
                !project
                    ?.project_id
            ) {

                throw new Error(
                    'Project creation failed: backend did not return a project ID.'
                );
            }


            const formData =
                new FormData();


            formData.append(
                'file',
                zipFile
            );


            const uploadResponse =
                await authFetch(
                    `${API_BASE_URL}/projects/${
                        encodeURIComponent(
                            project.project_id
                        )
                    }/upload-zip`,

                    {
                        method:
                            'POST',

                        body:
                            formData,
                    }
                );


            if (
                !uploadResponse.ok
            ) {

                let errorMessage =
                    `Project ZIP upload failed: ${
                        uploadResponse.status
                    }`;


                try {

                    const errorData =
                        await uploadResponse
                            .json();


                    if (
                        errorData
                            ?.detail
                    ) {

                        errorMessage =
                            errorData.detail;
                    }

                }

                catch {

                    // Keep default message.
                }


                throw new Error(
                    errorMessage
                );
            }


            await loadProjects();


            setProjectChats(
                []
            );


            setExpandedProjectId(
                project.project_id
            );


            await loadProjectChats(
                project.project_id
            );


            startNewProjectChat(
                project
            );

        }

        catch (error) {

            console.error(
                'Could not create project:',
                error
            );


            alert(
                error.message
                ||
                'Project could not be created.'
            );


            await loadProjects();

        }

        finally {

            setIsCreatingProject(
                false
            );
        }
    }


    // ========================================
    // SELECT SAVED CHAT
    // ========================================

    async function selectChat(
        chat,
        project = null
    ) {

        if (
            !chat
                ?.chat_id
        ) {
            return;
        }


        if (isStreaming) {

            await stopGenerationAndWait();
        }


        const selectedChatId =
            chat.chat_id;


        setActiveChat(
            selectedChatId
        );


        setChatId(
            selectedChatId
        );


        setActiveProject(
            project
        );


        if (
            project
                ?.project_id
        ) {

            setExpandedProjectId(
                project.project_id
            );
        }


        setInput(
            ''
        );


        setSelectedFile(
            null
        );


        setSelectedImages(
            []
        );


        setAttachMenuOpen(
            false
        );


        setModelMenuOpen(
            false
        );


        setMessages(
            []
        );


        autoScrollEnabledRef
            .current =
                true;


        try {

            const response =
                await authFetch(
                    `${API_BASE_URL}/chats/${
                        encodeURIComponent(
                            selectedChatId
                        )
                    }/messages`
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    `Chat messages error: ${
                        response.status
                    }`
                );
            }


            const data =
                await response
                    .json();


            const savedMessages =
                Array.isArray(
                    data.messages
                )
                    ? data.messages
                    : [];


            const baseId =
                Date.now();


            const loadedMessages =
                savedMessages.map(
                    (
                        message,
                        index
                    ) => {

                        if (
                            message.sender ===
                            'user'
                        ) {

                            return {

                                id:
                                    baseId + index,

                                text:
                                    message.text
                                    ||
                                    '',

                                sender:
                                    'user',

                                file:
                                    null,
                            };
                        }


                        return {

                            id:
                                baseId + index,

                            text:
                                message.text
                                ||
                                '',

                            sender:
                                'assistant',

                            tools:
                                [],

                            files:
                                [],

                            modelHint:
                                null,

                            isThinking:
                                false,

                            isComplete:
                                true,
                        };
                    }
                );


            setMessages(
                loadedMessages
            );


            requestAnimationFrame(
                () => {

                    const container =
                        messagesContainerRef
                            .current;


                    if (
                        container
                    ) {

                        container.scrollTop =
                            container
                                .scrollHeight;
                    }
                }
            );

        }

        catch (error) {

            console.error(
                'Could not load chat:',
                error
            );


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

                    files:
                        [],

                    modelHint:
                        null,

                    isThinking:
                        false,

                    isComplete:
                        true,
                },
            ]);
        }
    }


    // ========================================
    // DELETE SAVED CHAT
    // ========================================

    async function deleteSavedChat(
        event,
        chat,
        project = null
    ) {

        event.stopPropagation();


        if (
            !chat
                ?.chat_id
        ) {
            return;
        }


        const confirmed =
            window.confirm(
                `Delete "${
                    chat.title
                    ||
                    'New Chat'
                }"?`
            );


        if (!confirmed) {
            return;
        }


        if (
            isStreaming
            &&
            activeChat ===
                chat.chat_id
        ) {

            await stopGenerationAndWait();
        }


        try {

            const response =
                await authFetch(
                    `${API_BASE_URL}/chats/${
                        encodeURIComponent(
                            chat.chat_id
                        )
                    }`,

                    {
                        method:
                            'DELETE',
                    }
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    `Delete chat error: ${
                        response.status
                    }`
                );
            }


            if (
                activeChat ===
                chat.chat_id
            ) {

                const newChatId =
                    createClientId();


                setChatId(
                    newChatId
                );


                setActiveChat(
                    null
                );


                setActiveProject(
                    project
                );


                setMessages(
                    []
                );


                setInput(
                    ''
                );


                setSelectedFile(
                    null
                );


                setSelectedImages(
                    []
                );


                setAttachMenuOpen(
                    false
                );


                setModelMenuOpen(
                    false
                );


                setSelectedModel(
                    'luna'
                );
            }


            if (
                project
                    ?.project_id
            ) {

                await loadProjectChats(
                    project.project_id
                );

            }

            else {

                await loadChats();
            }

        }

        catch (error) {

            console.error(
                'Could not delete chat:',
                error
            );


            alert(
                'Chat could not be deleted.'
            );
        }
    }


    // ========================================
    // DELETE PROJECT
    // ========================================

    async function deleteProject(
        event,
        project
    ) {

        event.stopPropagation();


        if (
            !project
                ?.project_id
            ||
            isCreatingProject
        ) {
            return;
        }


        const confirmed =
            window.confirm(
                `Delete "${
                    project.name
                    ||
                    'Untitled Project'
                }"?

This will permanently delete the project, its project chats, and its stored files.`
            );


        if (!confirmed) {
            return;
        }


        if (
            isStreaming
            &&
            activeProject
                ?.project_id ===
            project.project_id
        ) {

            await stopGenerationAndWait();
        }


        try {

            const response =
                await authFetch(
                    `${API_BASE_URL}/projects/${
                        encodeURIComponent(
                            project.project_id
                        )
                    }`,

                    {
                        method:
                            'DELETE',
                    }
                );


            if (
                !response.ok
            ) {

                let errorMessage =
                    `Delete project error: ${
                        response.status
                    }`;


                try {

                    const errorData =
                        await response
                            .json();


                    if (
                        errorData
                            ?.detail
                    ) {

                        errorMessage =
                            errorData.detail;
                    }

                }

                catch {

                    // Keep default message.
                }


                throw new Error(
                    errorMessage
                );
            }


            if (
                expandedProjectId ===
                project.project_id
            ) {

                setExpandedProjectId(
                    null
                );


                setProjectChats(
                    []
                );
            }


            if (
                activeProject
                    ?.project_id ===
                project.project_id
            ) {

                const newChatId =
                    createClientId();


                setChatId(
                    newChatId
                );


                setActiveChat(
                    null
                );


                setActiveProject(
                    null
                );


                setMessages(
                    []
                );


                setInput(
                    ''
                );


                setSelectedFile(
                    null
                );


                setSelectedImages(
                    []
                );


                setAttachMenuOpen(
                    false
                );


                setModelMenuOpen(
                    false
                );


                setSelectedModel(
                    'luna'
                );
            }


            await loadProjects();
            await loadChats();

        }

        catch (error) {

            console.error(
                'Could not delete project:',
                error
            );


            alert(
                error.message
                ||
                'Project could not be deleted.'
            );
        }
    }


    // ========================================
    // INPUT COMPONENT
    // ========================================

    function renderInput() {

        return (
            <div className="input-wrapper">

                {
                    selectedFile && (
                        <div className="selected-file">

                            <div className="selected-file-info">

                                <span className="file-icon">
                                    {
                                        selectedFile
                                            .category ===
                                        'pdf'

                                            ? 'PDF'

                                            : selectedFile
                                                .category ===
                                            'document'

                                                ? 'DOC'

                                                : 'FILE'
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
                    )
                }


                {
                    selectedImages.length >
                    0
                    && (
                        <div
                            style={{
                                display:
                                    'flex',

                                flexWrap:
                                    'wrap',

                                gap:
                                    '8px',

                                maxWidth:
                                    '100%',
                            }}
                        >
                            {
                                selectedImages.map(
                                    (
                                        image,
                                        index
                                    ) => (
                                        <div
                                            className="selected-file"
                                            key={
                                                image.clientId
                                                ||
                                                `${image.name}-${index}`
                                            }
                                        >

                                            <div className="selected-file-info">

                                                <span className="file-icon">
                                                    {
                                                        `IMG ${index + 1}`
                                                    }
                                                </span>


                                                <span className="file-name">
                                                    {
                                                        image.name
                                                    }
                                                </span>

                                            </div>


                                            <button
                                                className="remove-file-button"
                                                onClick={
                                                    () =>
                                                        removeSelectedImage(
                                                            index
                                                        )
                                                }
                                                aria-label={
                                                    `Remove image ${index + 1}`
                                                }
                                            >
                                                ×
                                            </button>

                                        </div>
                                    )
                                )
                            }
                        </div>
                    )
                }

                <div className="chat-disclaimer">
                    ChatOmni can make mistakes. Check important information.
                </div>

                
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


                        {
                            attachMenuOpen && (
                                <div className="attach-menu">

                                    <button
                                        className="attach-option"
                                        onClick={
                                            chooseFile
                                        }
                                    >
                                        <span className="attach-option-icon">
                                            FILE
                                        </span>

                                        <span>
                                            Upload File
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
                            )
                        }

                    </div>


                    <input
                        ref={
                            fileInputRef
                        }
                        className="hidden-file-input"
                        type="file"
                        accept={
                            SUPPORTED_FILE_ACCEPT
                        }
                        onChange={
                            handleFileChange
                        }
                    />


                    <input
                        ref={
                            imageInputRef
                        }
                        className="hidden-file-input"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
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
                            (
                                event
                            ) =>
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


                <div className="input-meta-row">

                    <div
                        className="model-selector"
                        ref={
                            modelAreaRef
                        }
                    >

                        <button
                            type="button"
                            className="model-selector-button"
                            onClick={
                                () => {

                                    setAttachMenuOpen(
                                        false
                                    );


                                    setModelMenuOpen(
                                        (
                                            current
                                        ) =>
                                            !current
                                    );
                                }
                            }
                            disabled={
                                isStreaming
                            }
                            aria-haspopup="menu"
                            aria-expanded={
                                modelMenuOpen
                            }
                            title="Choose model"
                        >

                            <span className="model-selector-dot" />


                            <span className="model-selector-name">
                                {
                                    selectedModel ===
                                    'terra'

                                        ? 'Terra'

                                        : 'Luna'
                                }
                            </span>


                            <span className="model-selector-chevron">
                                ▾
                            </span>

                        </button>


                        {
                            modelMenuOpen && (
                                <div
                                    className="model-menu"
                                    role="menu"
                                >

                                    <button
                                        type="button"
                                        className={
                                            `model-option ${
                                                selectedModel ===
                                                'luna'

                                                    ? 'active'

                                                    : ''
                                            }`
                                        }
                                        onClick={
                                            () => {

                                                setSelectedModel(
                                                    'luna'
                                                );


                                                setModelMenuOpen(
                                                    false
                                                );
                                            }
                                        }
                                        role="menuitem"
                                    >

                                        <span className="model-option-main">

                                            <span className="model-option-name">
                                                Luna
                                            </span>


                                            <span className="model-option-badge">
                                                Default
                                            </span>

                                        </span>


                                        <span className="model-option-description">
                                            Fast & efficient · Everyday questions and general tasks
                                        </span>

                                    </button>


                                    <button
                                        type="button"
                                        className={
                                            `model-option ${
                                                selectedModel ===
                                                'terra'

                                                    ? 'active'

                                                    : ''
                                            }`
                                        }
                                        onClick={
                                            () => {

                                                setSelectedModel(
                                                    'terra'
                                                );


                                                setModelMenuOpen(
                                                    false
                                                );
                                            }
                                        }
                                        role="menuitem"
                                    >

                                        <span className="model-option-main">

                                            <span className="model-option-name">
                                                Terra
                                            </span>

                                        </span>


                                        <span className="model-option-description">
                                            More powerful · Coding, analysis and complex tasks
                                        </span>

                                    </button>

                                </div>
                            )
                        }

                    </div>


                    <span className="model-current-description">
                        {
                            selectedModel ===
                            'terra'

                                ? 'More powerful for complex work'

                                : 'Fast and cost-efficient for everyday use'
                        }
                    </span>

                </div>

            </div>
        );
    }


    // ========================================
    // UI
    // ========================================

    if (authChecking) {

        return (
            <div
                className={
                    `app ${theme}`
                }
            >

                <div className="auth-screen">

                    <div className="auth-card auth-loading-card">

                        <div className="auth-brand">
                            ChatOmni
                        </div>


                        <div className="auth-loading-row">

                            <span className="thinking-dots">
                                <span />
                                <span />
                                <span />
                            </span>

                        </div>

                    </div>

                </div>

            </div>
        );
    }


    if (
        !authToken
        ||
        !currentUser
    ) {

        return (
            <div
                className={
                    `app ${theme}`
                }
            >

                <div className="auth-screen">

                    <div className="auth-card">

                        <div className="auth-card-header">

                            <div className="auth-brand">
                                ChatOmni
                            </div>


                            <h1 className="auth-title">
                                {
                                    authMode ===
                                    'register'

                                        ? 'Create your account'

                                        : 'Welcome back'
                                }
                            </h1>


                            <p className="auth-subtitle">
                                {
                                    authMode ===
                                    'register'

                                        ? 'Create an account to start using ChatOmni.'

                                        : 'Sign in to continue to your chats and projects.'
                                }
                            </p>

                        </div>


                        <form
                            className="auth-form"
                            onSubmit={
                                handleAuthSubmit
                            }
                        >

                            {
                                authMode ===
                                'register'
                                && (
                                    <label className="auth-field">

                                        <span>
                                            Name
                                        </span>


                                        <input
                                            type="text"
                                            value={
                                                authName
                                            }
                                            onChange={
                                                (
                                                    event
                                                ) =>
                                                    setAuthName(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                            }
                                            placeholder="Your name"
                                            autoComplete="name"
                                            disabled={
                                                authLoading
                                            }
                                        />

                                    </label>
                                )
                            }


                            <label className="auth-field">

                                <span>
                                    Email
                                </span>


                                <input
                                    type="email"
                                    value={
                                        authEmail
                                    }
                                    onChange={
                                        (
                                            event
                                        ) =>
                                            setAuthEmail(
                                                event
                                                    .target
                                                    .value
                                            )
                                    }
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    disabled={
                                        authLoading
                                    }
                                />

                            </label>


                            <label className="auth-field">

                                <span>
                                    Password
                                </span>


                                <input
                                    type="password"
                                    value={
                                        authPassword
                                    }
                                    onChange={
                                        (
                                            event
                                        ) =>
                                            setAuthPassword(
                                                event
                                                    .target
                                                    .value
                                            )
                                    }
                                    placeholder="Password"
                                    autoComplete={
                                        authMode ===
                                        'register'

                                            ? 'new-password'

                                            : 'current-password'
                                    }
                                    disabled={
                                        authLoading
                                    }
                                />

                            </label>


                            {
                                authError && (
                                    <div
                                        className="auth-error"
                                        role="alert"
                                    >
                                        {
                                            authError
                                        }
                                    </div>
                                )
                            }


                            <button
                                type="submit"
                                className="auth-submit-button"
                                disabled={
                                    authLoading
                                }
                            >
                                {
                                    authLoading

                                        ? (
                                            authMode ===
                                            'register'

                                                ? 'Creating account...'

                                                : 'Signing in...'
                                        )

                                        : (
                                            authMode ===
                                            'register'

                                                ? 'Create account'

                                                : 'Sign in'
                                        )
                                }
                            </button>

                        </form>


                        <div className="auth-switch-row">

                            <span>
                                {
                                    authMode ===
                                    'register'

                                        ? 'Already have an account?'

                                        : 'New to ChatOmni?'
                                }
                            </span>


                            <button
                                type="button"
                                className="auth-switch-button"
                                onClick={
                                    switchAuthMode
                                }
                                disabled={
                                    authLoading
                                }
                            >
                                {
                                    authMode ===
                                    'register'

                                        ? 'Sign in'

                                        : 'Create account'
                                }
                            </button>

                        </div>

                    </div>

                </div>

            </div>
        );
    }


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


                        <div className="sidebar-user">

                            <div className="sidebar-user-text">

                                <span className="sidebar-user-name">
                                    {
                                        currentUser.name
                                        ||
                                        'User'
                                    }
                                </span>


                                <span className="sidebar-user-email">
                                    {
                                        currentUser.email
                                        ||
                                        ''
                                    }
                                </span>

                            </div>


                            <button
                                type="button"
                                className="logout-button"
                                onClick={
                                    handleLogout
                                }
                            >
                                Log out
                            </button>

                        </div>


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


                        <input
                            ref={
                                projectZipInputRef
                            }
                            className="hidden-file-input"
                            type="file"
                            accept=".zip,application/zip,application/x-zip-compressed"
                            onChange={
                                handleProjectZipChange
                            }
                        />

                    </div>


                    <div className="sidebar-chats">

                        <section className="sidebar-section">

                            <div className="sidebar-section-header">

                                <p className="chats-title">
                                    Projects
                                </p>


                                <button
                                    type="button"
                                    className="new-project-button"
                                    onClick={
                                        chooseProjectZip
                                    }
                                    disabled={
                                        isCreatingProject
                                    }
                                    title="Create a project from ZIP"
                                    aria-label="Create a project from ZIP"
                                >
                                    {
                                        isCreatingProject
                                            ? 'Creating…'
                                            : '+ New Project'
                                    }
                                </button>

                            </div>


                            <div className="project-list">

                                {
                                    projects.length ===
                                    0

                                        ? (
                                            <p className="sidebar-empty-state">
                                                No projects yet
                                            </p>
                                        )

                                        : (
                                            projects.map(
                                                (
                                                    project
                                                ) => {

                                                    const isExpandedProject =
                                                        expandedProjectId ===
                                                        project.project_id;


                                                    const isCurrentProject =
                                                        activeProject
                                                            ?.project_id ===
                                                        project.project_id;


                                                    return (
                                                        <div
                                                            key={
                                                                project.project_id
                                                            }
                                                            className="project-group"
                                                        >

                                                            <div className="project-row">

                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        `project-item ${
                                                                            isExpandedProject
                                                                                ? 'active'
                                                                                : ''
                                                                        } ${
                                                                            isCurrentProject
                                                                                ? 'current-project'
                                                                                : ''
                                                                        }`
                                                                    }
                                                                    onClick={
                                                                        () =>
                                                                            selectProject(
                                                                                project
                                                                            )
                                                                    }
                                                                    title={
                                                                        project.name
                                                                    }
                                                                >

                                                                    <span className="project-item-icon">
                                                                        ◇
                                                                    </span>


                                                                    <span className="project-item-name">
                                                                        {
                                                                            project.name
                                                                        }
                                                                    </span>


                                                                    <span className="project-item-chevron">
                                                                        {
                                                                            isExpandedProject
                                                                                ? '⌄'
                                                                                : '›'
                                                                        }
                                                                    </span>

                                                                </button>


                                                                <button
                                                                    type="button"
                                                                    className="project-delete-button"
                                                                    onClick={
                                                                        (
                                                                            event
                                                                        ) =>
                                                                            deleteProject(
                                                                                event,
                                                                                project
                                                                            )
                                                                    }
                                                                    disabled={
                                                                        isCreatingProject
                                                                    }
                                                                    title={
                                                                        `Delete ${project.name}`
                                                                    }
                                                                    aria-label={
                                                                        `Delete ${project.name}`
                                                                    }
                                                                >
                                                                    🗑
                                                                </button>

                                                            </div>


                                                            {
                                                                isExpandedProject && (
                                                                    <div className="project-chat-panel">

                                                                        <button
                                                                            type="button"
                                                                            className="new-project-chat-button"
                                                                            onClick={
                                                                                () =>
                                                                                    startNewProjectChat(
                                                                                        project
                                                                                    )
                                                                            }
                                                                        >

                                                                            <span>
                                                                                +
                                                                            </span>

                                                                            New Project Chat

                                                                        </button>


                                                                        <div className="project-chat-list">

                                                                            {
                                                                                projectChats.length ===
                                                                                0

                                                                                    ? (
                                                                                        <p className="project-chat-empty">
                                                                                            No project chats yet
                                                                                        </p>
                                                                                    )

                                                                                    : (
                                                                                        projectChats.map(
                                                                                            (
                                                                                                chat
                                                                                            ) => (
                                                                                                <div
                                                                                                    key={
                                                                                                        chat.chat_id
                                                                                                    }
                                                                                                    className={
                                                                                                        `chat-item project-chat-item ${
                                                                                                            activeChat ===
                                                                                                            chat.chat_id

                                                                                                                ? 'active'

                                                                                                                : ''
                                                                                                        }`
                                                                                                    }
                                                                                                    onClick={
                                                                                                        () =>
                                                                                                            selectChat(
                                                                                                                chat,
                                                                                                                project
                                                                                                            )
                                                                                                    }
                                                                                                    role="button"
                                                                                                    tabIndex={0}
                                                                                                    title={
                                                                                                        chat.title
                                                                                                        ||
                                                                                                        'New Chat'
                                                                                                    }
                                                                                                    onKeyDown={
                                                                                                        (
                                                                                                            event
                                                                                                        ) => {

                                                                                                            if (
                                                                                                                event.key ===
                                                                                                                'Enter'
                                                                                                            ) {

                                                                                                                selectChat(
                                                                                                                    chat,
                                                                                                                    project
                                                                                                                );
                                                                                                            }
                                                                                                        }
                                                                                                    }
                                                                                                >

                                                                                                    <span className="sidebar-item-label">
                                                                                                        {
                                                                                                            chat.title
                                                                                                            ||
                                                                                                            'New Chat'
                                                                                                        }
                                                                                                    </span>


                                                                                                    <button
                                                                                                        type="button"
                                                                                                        className="chat-delete-button"
                                                                                                        onClick={
                                                                                                            (
                                                                                                                event
                                                                                                            ) =>
                                                                                                                deleteSavedChat(
                                                                                                                    event,
                                                                                                                    chat,
                                                                                                                    project
                                                                                                                )
                                                                                                        }
                                                                                                        title="Delete chat"
                                                                                                        aria-label="Delete chat"
                                                                                                    >
                                                                                                        🗑
                                                                                                    </button>

                                                                                                </div>
                                                                                            )
                                                                                        )
                                                                                    )
                                                                            }

                                                                        </div>

                                                                    </div>
                                                                )
                                                            }

                                                        </div>
                                                    );
                                                }
                                            )
                                        )
                                }

                            </div>

                        </section>


                        <section className="sidebar-section normal-chats-section">

                            <div className="sidebar-section-header">

                                <p className="chats-title">
                                    Chats
                                </p>

                            </div>


                            <div className="chat-list">

                                {
                                    chats.length ===
                                    0

                                        ? (
                                            <p className="sidebar-empty-state">
                                                No chats yet
                                            </p>
                                        )

                                        : (
                                            chats.map(
                                                (
                                                    chat
                                                ) => (
                                                    <div
                                                        key={
                                                            chat.chat_id
                                                        }
                                                        className={
                                                            `chat-item ${
                                                                !activeProject
                                                                &&
                                                                activeChat ===
                                                                chat.chat_id

                                                                    ? 'active'

                                                                    : ''
                                                            }`
                                                        }
                                                        onClick={
                                                            () =>
                                                                selectChat(
                                                                    chat,
                                                                    null
                                                                )
                                                        }
                                                        role="button"
                                                        tabIndex={0}
                                                        title={
                                                            chat.title
                                                            ||
                                                            'New Chat'
                                                        }
                                                        onKeyDown={
                                                            (
                                                                event
                                                            ) => {

                                                                if (
                                                                    event.key ===
                                                                    'Enter'
                                                                ) {

                                                                    selectChat(
                                                                        chat,
                                                                        null
                                                                    );
                                                                }
                                                            }
                                                        }
                                                    >

                                                        <span className="sidebar-item-label">
                                                            {
                                                                chat.title
                                                                ||
                                                                'New Chat'
                                                            }
                                                        </span>


                                                        <button
                                                            type="button"
                                                            className="chat-delete-button"
                                                            onClick={
                                                                (
                                                                    event
                                                                ) =>
                                                                    deleteSavedChat(
                                                                        event,
                                                                        chat,
                                                                        null
                                                                    )
                                                            }
                                                            title="Delete chat"
                                                            aria-label="Delete chat"
                                                        >
                                                            🗑
                                                        </button>

                                                    </div>
                                                )
                                            )
                                        )
                                }

                            </div>

                        </section>

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


                {
                    messages.length ===
                    0

                        ? (
                            <div className="start-screen">

                                <div className="welcome">

                                    <h1>
                                        ChatOmni
                                    </h1>


                                    {
                                        activeProject && (
                                            <div className="active-project-context">

                                                <span className="active-project-context-icon">
                                                    ◇
                                                </span>

                                                <span>
                                                    {
                                                        activeProject.name
                                                    }
                                                </span>

                                            </div>
                                        )
                                    }

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

                                <div
                                    className="messages-scroll"
                                    ref={
                                        messagesContainerRef
                                    }
                                    onScroll={
                                        handleMessagesScroll
                                    }
                                    onWheel={
                                        handleMessagesWheel
                                    }
                                >

                                    <div className="messages">

                                        {
                                            messages.map(
                                                (
                                                    message
                                                ) =>
                                                    message.sender ===
                                                    'user'

                                                        ? (
                                                            <div
                                                                key={
                                                                    message.id
                                                                }
                                                                id={
                                                                    `message-${message.id}`
                                                                }
                                                                className="user-message conversation-topic-anchor"
                                                            >

                                                                {
                                                                    (
                                                                        message.attachments
                                                                        ||
                                                                        []
                                                                    ).map(
                                                                        (
                                                                            attachment,
                                                                            attachmentIndex
                                                                        ) => (
                                                                            <div
                                                                                className="message-file"
                                                                                key={
                                                                                    `${message.id}-attachment-${attachmentIndex}`
                                                                                }
                                                                            >

                                                                                <span>
                                                                                    {
                                                                                        `IMG ${attachmentIndex + 1}`
                                                                                    }
                                                                                </span>


                                                                                {
                                                                                    attachment.name
                                                                                }

                                                                            </div>
                                                                        )
                                                                    )
                                                                }


                                                                {
                                                                    message.file && (
                                                                        <div className="message-file">

                                                                            <span>
                                                                                {
                                                                                    message
                                                                                        .file
                                                                                        .category ===
                                                                                    'pdf'

                                                                                        ? 'PDF'

                                                                                        : message
                                                                                            .file
                                                                                            .category ===
                                                                                        'image'

                                                                                            ? 'IMG'

                                                                                            : 'CODE'
                                                                                }
                                                                            </span>


                                                                            {
                                                                                message
                                                                                    .file
                                                                                    .name
                                                                            }

                                                                        </div>
                                                                    )
                                                                }


                                                                {
                                                                    message.text && (
                                                                        <div>
                                                                            {
                                                                                message.text
                                                                            }
                                                                        </div>
                                                                    )
                                                                }

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


                                                                {
                                                                    (
                                                                        message.files
                                                                        ||
                                                                        []
                                                                    ).map(
                                                                        (
                                                                            file
                                                                        ) => (
                                                                            <GeneratedFileCard
                                                                                key={
                                                                                    file.file_id
                                                                                }
                                                                                file={
                                                                                    file
                                                                                }
                                                                            />
                                                                        )
                                                                    )
                                                                }


                                                                {
                                                                    message.isComplete
                                                                    &&
                                                                    message.modelHint
                                                                    && (
                                                                        <div className="model-fit-hint">

                                                                            <div className="model-fit-hint-text">

                                                                                <span className="model-fit-hint-label">
                                                                                    Tip
                                                                                </span>


                                                                                <span>
                                                                                    {
                                                                                        message
                                                                                            .modelHint
                                                                                            .message
                                                                                    }
                                                                                </span>

                                                                            </div>


                                                                            <button
                                                                                type="button"
                                                                                className="model-fit-hint-button"
                                                                                onClick={
                                                                                    () =>
                                                                                        setSelectedModel(
                                                                                            message
                                                                                                .modelHint
                                                                                                .recommendedModel
                                                                                        )
                                                                                }
                                                                            >
                                                                                {
                                                                                    message
                                                                                        .modelHint
                                                                                        .recommendedModel ===
                                                                                    'terra'

                                                                                        ? 'Switch to Terra'

                                                                                        : 'Switch to Luna'
                                                                                }
                                                                            </button>

                                                                        </div>
                                                                    )
                                                                }

                                                            </div>
                                                        )
                                            )
                                        }

                                    </div>

                                </div>


                                {
                                    conversationTopics.length >
                                    0
                                    && (
                                        <nav
                                            className="conversation-navigator"
                                            aria-label="Conversation topics"
                                        >

                                            <div className="conversation-navigator-list">

                                                {
                                                    conversationTopics.map(
                                                        (topic) => (
                                                            <button
                                                                key={
                                                                    topic.messageId
                                                                }
                                                                type="button"
                                                                className={
                                                                    `conversation-topic-button ${
                                                                        activeTopicMessageId ===
                                                                        topic.messageId

                                                                            ? 'active'

                                                                            : ''
                                                                    }`
                                                                }
                                                                onClick={
                                                                    () =>
                                                                        scrollToConversationTopic(
                                                                            topic.messageId
                                                                        )
                                                                }
                                                                title={
                                                                    topic.label
                                                                }
                                                                aria-label={
                                                                    `Go to topic: ${topic.label}`
                                                                }
                                                            >

                                                                <span className="conversation-topic-label">
                                                                    {
                                                                        topic.label
                                                                    }
                                                                </span>


                                                                <span
                                                                    className="conversation-topic-icon"
                                                                    aria-hidden="true"
                                                                >
                                                                    {
                                                                        topic.icon
                                                                    }
                                                                </span>

                                                            </button>
                                                        )
                                                    )
                                                }

                                            </div>

                                        </nav>
                                    )
                                }


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
    );
}


export default App;
