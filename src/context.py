from dataclasses import dataclass

@dataclass
class Context:
    user_id: str
    project_id: str | None = None