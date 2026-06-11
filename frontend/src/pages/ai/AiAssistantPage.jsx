import { useState } from "react";

import { apiClient } from "../../api/axiosClient.js";

const STORAGE_CONTEXT_KEY = "autoflow.ai.context";
const STORAGE_MESSAGES_KEY = "autoflow.ai.messages";
const FIXED_PROMPT = "Sos un asistente de atenci\u00f3n al cliente. Respond\u00e9 siempre de forma clara, amable y concisa.";
const ERROR_MESSAGE = "Hubo un error al obtener la respuesta. Intent\u00e1 de nuevo.";

function readMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_MESSAGES_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item?.role && item?.content) : [];
  } catch {
    return [];
  }
}

export default function AiAssistantPage() {
  const [context, setContext] = useState(() => localStorage.getItem(STORAGE_CONTEXT_KEY) || "");
  const [messages, setMessages] = useState(readMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState(() => (localStorage.getItem(STORAGE_CONTEXT_KEY) ? "chat" : "setup"));
  const [input, setInput] = useState("");
  const [setupError, setSetupError] = useState("");

  const persistMessages = (nextMessages) => {
    setMessages(nextMessages);
    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(nextMessages));
  };

  const saveContext = () => {
    const trimmedContext = context.trim();
    if (!trimmedContext) {
      setSetupError("Peg\u00e1 el contexto del chatbot antes de continuar.");
      return;
    }
    localStorage.setItem(STORAGE_CONTEXT_KEY, trimmedContext);
    setContext(trimmedContext);
    setSetupError("");
    setView("chat");
  };

  const clearHistory = () => {
    persistMessages([]);
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    const nextMessages = [...messages, { role: "user", content }];
    persistMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await apiClient.post("/ai/chat/", {
        context: context.trim(),
        messages: nextMessages,
      });
      const assistantMessage = response.data?.message || { role: "assistant", content: ERROR_MESSAGE };
      persistMessages([...nextMessages, assistantMessage]);
    } catch {
      persistMessages([...nextMessages, { role: "assistant", content: ERROR_MESSAGE }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="ai-page-shell">
      <style>{`
        .ai-page-shell {
          min-height: calc(100vh - 96px);
          background: #f5f7fb;
          color: #1f2937;
          padding: 24px;
        }
        .ai-card {
          max-width: 1120px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }
        .ai-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
        }
        .ai-title {
          margin: 0;
          font-size: 26px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: 0;
        }
        .ai-subtitle {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 14px;
        }
        .ai-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ai-button {
          border: 0;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          background: #e5e7eb;
          color: #1f2937;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .ai-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
        }
        .ai-button-primary {
          background: #1976d2;
          color: #ffffff;
        }
        .ai-button-danger {
          background: #fee2e2;
          color: #991b1b;
        }
        .ai-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
          box-shadow: none;
        }
        .ai-setup {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 24px;
          padding: 24px;
        }
        .ai-label {
          display: block;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .ai-textarea,
        .ai-input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          background: #ffffff;
          color: #111827;
          font: inherit;
          outline: none;
          transition: border 0.15s ease, box-shadow 0.15s ease;
        }
        .ai-textarea {
          min-height: 340px;
          resize: vertical;
          padding: 14px;
          line-height: 1.5;
        }
        .ai-input {
          min-height: 52px;
          max-height: 138px;
          resize: none;
          padding: 14px;
          line-height: 1.45;
        }
        .ai-textarea:focus,
        .ai-input:focus {
          border-color: #1976d2;
          box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.12);
        }
        .ai-help {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 18px;
          color: #475569;
          font-size: 14px;
          line-height: 1.55;
        }
        .ai-help-title {
          color: #0f172a;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .ai-help ul {
          padding-left: 18px;
          margin: 10px 0 0;
        }
        .ai-error {
          margin: 12px 0 0;
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 14px;
        }
        .ai-chat {
          display: flex;
          flex-direction: column;
          min-height: 620px;
        }
        .ai-fixed-prompt {
          margin: 16px 24px 0;
          padding: 12px 14px;
          border-radius: 12px;
          background: #eff6ff;
          color: #1e40af;
          font-size: 13px;
        }
        .ai-messages {
          flex: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
          background: #f8fafc;
        }
        .ai-empty {
          margin: auto;
          max-width: 460px;
          text-align: center;
          color: #64748b;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 24px;
        }
        .ai-message-row {
          display: flex;
        }
        .ai-message-row-user {
          justify-content: flex-end;
        }
        .ai-message-row-assistant {
          justify-content: flex-start;
        }
        .ai-bubble {
          max-width: min(720px, 82%);
          border-radius: 18px;
          padding: 12px 14px;
          white-space: pre-wrap;
          line-height: 1.5;
          font-size: 15px;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
        }
        .ai-bubble-user {
          background: #1976d2;
          color: #ffffff;
          border-bottom-right-radius: 6px;
        }
        .ai-bubble-assistant {
          background: #ffffff;
          color: #1f2937;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 6px;
        }
        .ai-typing {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
        }
        .ai-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #94a3b8;
          animation: aiPulse 1.1s infinite ease-in-out;
        }
        .ai-dot:nth-child(2) {
          animation-delay: 0.15s;
        }
        .ai-dot:nth-child(3) {
          animation-delay: 0.3s;
        }
        .ai-composer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          padding: 18px 24px 24px;
          border-top: 1px solid #e5e7eb;
          background: #ffffff;
        }
        @keyframes aiPulse {
          0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
        @media (max-width: 860px) {
          .ai-page-shell {
            padding: 12px;
          }
          .ai-header,
          .ai-setup,
          .ai-composer {
            padding-left: 16px;
            padding-right: 16px;
          }
          .ai-header {
            flex-direction: column;
          }
          .ai-setup {
            grid-template-columns: 1fr;
          }
          .ai-chat {
            min-height: 560px;
          }
          .ai-messages {
            padding: 16px;
          }
          .ai-bubble {
            max-width: 94%;
          }
          .ai-composer {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="ai-card">
        <header className="ai-header">
          <div>
            <h1 className="ai-title">App IA integrada</h1>
            <p className="ai-subtitle">Chatbot personalizado con contexto propio para atenci\u00f3n al cliente.</p>
          </div>
          {view === "chat" && (
            <div className="ai-actions">
              <button type="button" className="ai-button" onClick={() => setView("setup")}>Configuraci\u00f3n</button>
              <button type="button" className="ai-button ai-button-danger" onClick={clearHistory}>Limpiar historial</button>
            </div>
          )}
        </header>

        {view === "setup" ? (
          <div className="ai-setup">
            <div>
              <label className="ai-label" htmlFor="ai-context">Contexto, personalidad y conocimiento</label>
              <textarea
                id="ai-context"
                className="ai-textarea"
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Peg\u00e1 ac\u00e1 informaci\u00f3n del negocio, tono de voz, preguntas frecuentes, pol\u00edticas, horarios, condiciones comerciales y cualquier dato que el chatbot deba conocer."
              />
              {setupError && <div className="ai-error">{setupError}</div>}
              <div className="ai-actions" style={{ marginTop: 14 }}>
                <button type="button" className="ai-button ai-button-primary" onClick={saveContext}>Guardar contexto y abrir chat</button>
                {messages.length > 0 && <button type="button" className="ai-button" onClick={() => setView("chat")}>Volver al chat</button>}
              </div>
            </div>
            <aside className="ai-help">
              <div className="ai-help-title">Instrucci\u00f3n fija del sistema</div>
              <div>{FIXED_PROMPT}</div>
              <ul>
                <li>El texto guardado se combina con la instrucci\u00f3n fija como system prompt.</li>
                <li>Todo el historial se env\u00eda en cada consulta para conservar coherencia.</li>
                <li>La API key se toma desde el backend, nunca desde este archivo.</li>
              </ul>
            </aside>
          </div>
        ) : (
          <div className="ai-chat">
            <div className="ai-fixed-prompt">
              Chat activo con contexto propio. Puede modificarlo desde Configuraci\u00f3n.
            </div>
            <div className="ai-messages">
              {messages.length === 0 && !isLoading && (
                <div className="ai-empty">
                  Escriba la primera consulta. El asistente responder\u00e1 usando el contexto configurado.
                </div>
              )}
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`ai-message-row ai-message-row-${message.role}`}>
                  <div className={`ai-bubble ai-bubble-${message.role}`}>{message.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="ai-message-row ai-message-row-assistant">
                  <div className="ai-bubble ai-bubble-assistant">
                    <span className="ai-typing">
                      escribiendo
                      <span className="ai-dot" />
                      <span className="ai-dot" />
                      <span className="ai-dot" />
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="ai-composer">
              <textarea
                className="ai-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Escriba un mensaje y presione Enter para enviar. Shift + Enter agrega una l\u00ednea."
                aria-label="Mensaje para el asistente"
                disabled={isLoading}
              />
              <button type="button" className="ai-button ai-button-primary" onClick={sendMessage} disabled={isLoading || !input.trim()}>
                Enviar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
