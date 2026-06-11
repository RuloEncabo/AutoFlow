from __future__ import annotations

import json
import time
import uuid
from types import SimpleNamespace
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from .models import DEFAULT_SYSTEM_PROMPT, ChatbotConfig, ChatbotInteraction, ChatbotRole
from .tools import ChatbotToolError, ToolRegistry


class ChatbotServiceError(Exception):
    pass


def get_active_chatbot_config():
    config = ChatbotConfig.objects.filter(is_active=True).order_by("-updated_at").first()
    if config:
        return config
    return SimpleNamespace(
        model_name=settings.OPENAI_MODEL,
        system_prompt=DEFAULT_SYSTEM_PROMPT,
        max_tokens=900,
        temperature=0.2,
        enabled_tools=[],
    )


class OpenAIChatbotClient:
    def __init__(self, config):
        self.api_key = settings.OPENAI_API_KEY
        self.api_url = settings.OPENAI_API_URL
        self.model_name = config.model_name or settings.OPENAI_MODEL
        self.max_tokens = int(config.max_tokens or 900)
        self.temperature = float(config.temperature or 0.2)

    def chat(self, messages: list[dict], tools: list[dict] | None = None, tool_choice: str | None = None) -> dict:
        if not self.api_key:
            raise ChatbotServiceError("OPENAI_API_KEY no esta configurada en el entorno.")

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }
        if tools:
            payload["tools"] = tools
        if tool_choice:
            payload["tool_choice"] = tool_choice

        request = Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise ChatbotServiceError(f"OpenAI respondio con error HTTP {exc.code}: {detail[:300]}") from exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise ChatbotServiceError("Hubo un error al obtener la respuesta del modelo.") from exc


class ChatbotOrchestrator:
    def __init__(self, user):
        self.user = user
        self.config = get_active_chatbot_config()
        self.registry = ToolRegistry(user=user, enabled_tools=self.config.enabled_tools)
        self.client = OpenAIChatbotClient(self.config)

    def run(
        self,
        *,
        session_id: str,
        message: str,
        history: list[dict] | None = None,
        pending_action: dict | None = None,
        confirmed: bool = False,
    ) -> dict:
        started = time.perf_counter()
        history = history or []
        tools_used: list[str] = []
        rich_content: list[dict] = []
        total_tokens = 0

        ChatbotInteraction.objects.create(
            user=self.user,
            session_id=session_id,
            role=ChatbotRole.USER,
            content=message,
            metadata={"confirmed": confirmed, "pending_action": pending_action or None},
        )

        if pending_action and confirmed:
            return self._run_confirmed_action(
                session_id=session_id,
                message=message,
                pending_action=pending_action,
                started=started,
            )

        prompt_messages = self._build_messages(history=history, message=message)
        openai_tools = self.registry.openai_tools()
        first_response = self.client.chat(messages=prompt_messages, tools=openai_tools)
        total_tokens += int(first_response.get("usage", {}).get("total_tokens") or 0)
        assistant_message = first_response.get("choices", [{}])[0].get("message", {})
        tool_calls = assistant_message.get("tool_calls") or []

        if tool_calls:
            prompt_messages.append(
                {
                    "role": "assistant",
                    "content": assistant_message.get("content") or "",
                    "tool_calls": tool_calls,
                }
            )
            for tool_call in tool_calls:
                name = tool_call.get("function", {}).get("name", "")
                arguments = self._parse_tool_arguments(tool_call.get("function", {}).get("arguments", "{}"))
                result = self._execute_tool(name, arguments)
                tools_used.append(name)
                rich_content.extend(result.get("rich_content") or [])
                prompt_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.get("id"),
                        "name": name,
                        "content": json.dumps(result, ensure_ascii=False, default=str),
                    }
                )

            final_response = self.client.chat(messages=prompt_messages, tools=openai_tools, tool_choice="none")
            total_tokens += int(final_response.get("usage", {}).get("total_tokens") or 0)
            content = (
                final_response.get("choices", [{}])[0]
                .get("message", {})
                .get("content")
                or "Consulta realizada correctamente."
            )
        else:
            content = assistant_message.get("content") or "No pude generar una respuesta para la consulta."

        response_time_ms = int((time.perf_counter() - started) * 1000)
        ChatbotInteraction.objects.create(
            user=self.user,
            session_id=session_id,
            role=ChatbotRole.ASSISTANT,
            content=content,
            tools_used=tools_used,
            tokens_used=total_tokens or None,
            response_time_ms=response_time_ms,
            metadata={"rich_content": rich_content},
        )
        return {
            "session_id": session_id,
            "message": {"role": "assistant", "content": content},
            "rich_content": rich_content,
            "tools_used": tools_used,
            "requires_confirmation": False,
            "pending_action": None,
        }

    def _build_messages(self, *, history: list[dict], message: str) -> list[dict]:
        role = getattr(self.user, "role", "")
        tools = ", ".join(definition.name for definition in self.registry.available_definitions()) or "sin tools disponibles"
        system_prompt = (
            f"{self.config.system_prompt}\n\n"
            "Reglas de seguridad:\n"
            "- Usa tools para consultar datos reales cuando la pregunta sea operativa.\n"
            "- No inventes datos si una tool no devuelve informacion.\n"
            "- No ejecutes acciones de escritura sin confirmacion explicita.\n"
            f"- Rol del usuario: {role or 'sin rol'}.\n"
            f"- Tools disponibles para este usuario: {tools}."
        )
        messages = [{"role": "system", "content": system_prompt}]
        for item in history[-16:]:
            if item.get("role") in {"user", "assistant"} and item.get("content"):
                messages.append({"role": item["role"], "content": str(item["content"])[:8000]})
        messages.append({"role": "user", "content": message})
        return messages

    def _execute_tool(self, name: str, arguments: dict) -> dict:
        try:
            result = self.registry.execute(name, arguments)
            return {"ok": True, "tool": name, "arguments": arguments, "data": result, **result}
        except ChatbotToolError as exc:
            return {
                "ok": False,
                "tool": name,
                "arguments": arguments,
                "error": str(exc),
                "rich_content": [{"type": "error", "title": "No se pudo ejecutar la consulta", "message": str(exc)}],
            }

    def _parse_tool_arguments(self, raw_arguments: str) -> dict:
        try:
            parsed = json.loads(raw_arguments or "{}")
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}

    def _run_confirmed_action(self, *, session_id: str, message: str, pending_action: dict, started: float) -> dict:
        # Las tools de escritura se agregaran en la siguiente etapa. Esta rama deja el contrato listo.
        content = "La accion solicitada requiere una tool de escritura que todavia no esta habilitada en esta etapa."
        response_time_ms = int((time.perf_counter() - started) * 1000)
        ChatbotInteraction.objects.create(
            user=self.user,
            session_id=session_id,
            role=ChatbotRole.ASSISTANT,
            content=content,
            tools_used=[],
            response_time_ms=response_time_ms,
            metadata={"pending_action": pending_action, "original_message": message},
        )
        return {
            "session_id": session_id,
            "message": {"role": "assistant", "content": content},
            "rich_content": [],
            "tools_used": [],
            "requires_confirmation": False,
            "pending_action": None,
        }


def new_session_id() -> str:
    return f"chat-{uuid.uuid4()}"
