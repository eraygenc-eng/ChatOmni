import subprocess
import uuid


MAX_CODE_LENGTH = 20000

MAX_OUTPUT_LENGTH = 12000


LANGUAGE_ALIASES = {
    "python": "python",
    "py": "python",

    "javascript": "javascript",
    "js": "javascript",
    "node": "javascript",
    "nodejs": "javascript",

    "java": "java",

    "c": "c",

    "cpp": "cpp",
    "c++": "cpp",
    "cxx": "cpp",

    "csharp": "csharp",
    "c#": "csharp",
    "cs": "csharp",

    "go": "go",
    "golang": "go",
}


LANGUAGE_CONFIGS = {
    "python": {
        "image": "chatomni-python-sandbox",
        "memory": "256m",
        "cpus": "0.5",
        "timeout": 10,
        "tmpfs": "/tmp:rw,noexec,nosuid,nodev,size=64m",
        "command": [
            "python",
            "-I",
            "-B",
            "-u",
            "-",
        ],
    },

    "javascript": {
        "image": "chatomni-javascript-sandbox",
        "memory": "256m",
        "cpus": "0.5",
        "timeout": 10,
        "tmpfs": "/tmp:rw,noexec,nosuid,nodev,size=64m",
        "command": [
            "node",
            "-",
        ],
    },

    "java": {
        "image": "chatomni-java-sandbox",
        "memory": "512m",
        "cpus": "1.0",
        "timeout": 15,
        "tmpfs": "/tmp:rw,noexec,nosuid,nodev,size=128m",
        "command": [
            "bash",
            "-c",
            (
                "cat > /tmp/Main.java "
                "&& javac -d /tmp /tmp/Main.java "
                "&& java -cp /tmp Main"
            ),
        ],
    },

    "c": {
        "image": "chatomni-gcc-sandbox",
        "memory": "384m",
        "cpus": "1.0",
        "timeout": 15,
        "tmpfs": "/tmp:rw,exec,nosuid,nodev,size=128m",
        "command": [
            "bash",
            "-c",
            (
                "cat > /tmp/main.c "
                "&& gcc /tmp/main.c -O0 -o /tmp/program "
                "&& /tmp/program"
            ),
        ],
    },

    "cpp": {
        "image": "chatomni-gcc-sandbox",
        "memory": "384m",
        "cpus": "1.0",
        "timeout": 15,
        "tmpfs": "/tmp:rw,exec,nosuid,nodev,size=128m",
        "command": [
            "bash",
            "-c",
            (
                "cat > /tmp/main.cpp "
                "&& g++ /tmp/main.cpp -O0 -o /tmp/program "
                "&& /tmp/program"
            ),
        ],
    },

    "csharp": {
        "image": "chatomni-csharp-sandbox",
        "memory": "512m",
        "cpus": "1.0",
        "timeout": 20,
        "tmpfs": "/tmp:rw,exec,nosuid,nodev,size=192m",
        "environment": [
            "DOTNET_CLI_HOME=/tmp/dotnet-home",
            "NUGET_PACKAGES=/tmp/nuget",
            "DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1",
            "DOTNET_CLI_TELEMETRY_OPTOUT=1",
        ],
        "command": [
            "bash",
            "-c",
            (
                "mkdir -p /tmp/app "
                "&& dotnet new console "
                "-o /tmp/app "
                "--force "
                "--no-restore "
                "> /dev/null "
                "&& cat > /tmp/app/Program.cs "
                "&& dotnet run "
                "--project /tmp/app "
                "--nologo "
                "-p:RestoreIgnoreFailedSources=true"
            ),
        ],
    },

    "go": {
        "image": "chatomni-go-sandbox",
        "memory": "512m",
        "cpus": "1.0",
        "timeout": 20,
        "tmpfs": "/tmp:rw,exec,nosuid,nodev,size=192m",
        "environment": [
            "GOCACHE=/tmp/go-cache",
            "GOPATH=/tmp/go",
        ],
        "command": [
            "bash",
            "-c",
            (
                "mkdir -p /tmp/go-cache /tmp/go "
                "&& cat > /tmp/main.go "
                "&& go run /tmp/main.go"
            ),
        ],
    },
}


# Converts language aliases to canonical names.
def normalize_language(
    language: str
):

    if not isinstance(
        language,
        str
    ):
        return None

    language = (
        language
        .strip()
        .lower()
    )

    return LANGUAGE_ALIASES.get(
        language
    )


# Shortens very large sandbox output.
def truncate_output(
    text: str
) -> str:

    if len(text) <= MAX_OUTPUT_LENGTH:
        return text

    return (
        text[:MAX_OUTPUT_LENGTH]
        + "\n\n[Output truncated]"
    )


# Removes a sandbox container if it is still running.
def remove_container(
    container_name: str
):

    try:

        subprocess.run(
            [
                "docker",
                "rm",
                "-f", # Force
                container_name,
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )

    except Exception:
        pass


# Runs code inside the selected language sandbox.
def run_code_sandbox(
    language: str,
    code: str
) -> str:

    normalized_language = normalize_language(
        language
    )


    if not normalized_language:

        supported_languages = (
            "Python, JavaScript, Java, C, "
            "C++, C#, and Go"
        )

        return (
            "Sandbox error: unsupported language. "
            f"Supported languages are: {supported_languages}."
        )


    if not isinstance(
        code,
        str
    ):
        return "Sandbox error: code must be a string."


    code = code.strip()


    if not code:
        return "Sandbox error: no code was provided."


    if len(code) > MAX_CODE_LENGTH:

        return (
            "Sandbox error: code is too large. "
            f"Maximum size is {MAX_CODE_LENGTH} characters."
        )


    config = LANGUAGE_CONFIGS[
        normalized_language
    ]


    container_name = (
        "chatomni-sandbox-"
        + normalized_language
        + "-"
        + uuid.uuid4().hex[:12]
    )


    command = [
        "docker",
        "run",
        "--rm",

        "--name",
        container_name,

        "-i",

        "--network",
        "none",

        "--read-only",

        "--memory",
        config["memory"],

        "--memory-swap",
        config["memory"],

        "--cpus",
        config["cpus"],

        "--pids-limit",
        "64",

        "--cap-drop",
        "ALL",

        "--security-opt",
        "no-new-privileges:true",

        "--tmpfs",
        config["tmpfs"],

        "--user",
        "10001:10001",

        "--env",
        "HOME=/tmp",

        "--env",
        "TMPDIR=/tmp",
    ]


    for environment_variable in config.get(
        "environment",
        []
    ):

        command.extend(
            [
                "--env",
                environment_variable,
            ]
        )


    command.append(
        config["image"]
    )


    command.extend(
        config["command"]
    )


    try:

        result = subprocess.run(
            command,
            input=code,
            capture_output=True,
            text=True,
            timeout=config["timeout"],
            encoding="utf-8",
            errors="replace",
        )


        stdout = truncate_output(
            result.stdout.strip()
        )


        stderr = truncate_output(
            result.stderr.strip()
        )


        output_parts = [
            (
                "Language: "
                f"{normalized_language}"
            ),
            (
                "Exit code: "
                f"{result.returncode}"
            ),
        ]


        if stdout:

            output_parts.append(
                f"stdout:\n{stdout}"
            )


        if stderr:

            output_parts.append(
                f"stderr:\n{stderr}"
            )


        if (
            not stdout
            and
            not stderr
        ):

            output_parts.append(
                "No output was produced."
            )


        return "\n\n".join(
            output_parts
        )


    except subprocess.TimeoutExpired:

        remove_container(
            container_name
        )


        return (
            "Sandbox error: execution exceeded "
            f"{config['timeout']} seconds "
            "and was stopped."
        )


    except FileNotFoundError:

        return (
            "Sandbox error: Docker command was not found."
        )


    except Exception as error:

        remove_container(
            container_name
        )


        return (
            f"Sandbox error: {error}"
        )