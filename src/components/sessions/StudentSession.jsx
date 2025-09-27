// src/components/StudentSession.jsx
import React, { useState, useEffect } from "react";
import Card from "../ui/Card";
import Modal from "../ui/Modal";

export default function StudentSession({ sessionId, notify }) {
  const [session, setSession] = useState(null);
  const [taskModel, setTaskModel] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [items, setItems] = useState([]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);

  // Load session, first task, task model, and items
  useEffect(() => {
    if (!sessionId) return;

    async function loadSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) throw new Error("Failed to load session");
        const data = await res.json();
        setSession(data);

        if (data.taskIds?.length > 0) {
          const taskId = data.taskIds[data.currentTaskIndex || 0];
          const tRes = await fetch(`/api/tasks/${taskId}`);
          if (tRes.ok) {
            const t = await tRes.json();
            setCurrentTask(t);

            const tmRes = await fetch(`/api/taskModels/${t.taskModelId}`);
            if (tmRes.ok) {
              const tm = await tmRes.json();
              setTaskModel(tm);
            }

            // load questions/items
            const qRes = await fetch("/api/questions");
            if (qRes.ok) {
              const allItems = await qRes.json();
              const linkedItems = allItems.filter((q) => q.id && t.questionId === q.id || t.itemIds?.includes(q.id));
              setItems(linkedItems);
              if (linkedItems.length > 0) {
                setCurrentItem(linkedItems[0]);
              }
            }
          }
        }
      } catch (err) {
        notify("❌ Failed to load session");
      }
    }

    loadSession();
  }, [sessionId]);

  // Load feedback from reports API
  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/reports/session/${sessionId}/feedback`)
      .then((r) => r.json())
      .then((data) => setFeedback(data))
      .catch(() => {}); // ignore if not ready yet
  }, [sessionId]);

  const submitAnswer = async () => {
    if (!currentTask || !currentItem) return;

    // 🔹 Find mapping for this item
    let observationId = null;
    let evidenceId = null;
    if (taskModel?.itemMappings?.length > 0) {
      const mapping = taskModel.itemMappings.find((m) => m.itemId === currentItem.id);
      if (mapping) {
        observationId = mapping.observationId;
        evidenceId = mapping.evidenceId;
      }
    }

    await fetch(`/api/sessions/${sessionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: currentTask.id,
        rawAnswer: answer,
        observationId,
        evidenceId,
      }),
    });

    // get next task
    const nextRes = await fetch(`/api/sessions/${sessionId}/next-task`);
    const next = await nextRes.json();

    if (next && next.taskId) {
      const tRes = await fetch(`/api/tasks/${next.taskId}`);
      if (tRes.ok) {
        const t = await tRes.json();
        setCurrentTask(t);

        const tmRes = await fetch(`/api/taskModels/${t.taskModelId}`);
        if (tmRes.ok) {
          const tm = await tmRes.json();
          setTaskModel(tm);
        }

        // reload questions
        const qRes = await fetch("/api/questions");
        if (qRes.ok) {
          const allItems = await qRes.json();
          const linkedItems = allItems.filter((q) => q.id && t.questionId === q.id || t.itemIds?.includes(q.id));
          setItems(linkedItems);
          if (linkedItems.length > 0) {
            setCurrentItem(linkedItems[0]);
          }
        }
      }
      setAnswer("");
    } else {
      // finish session
      await fetch(`/api/sessions/${sessionId}/finish`, { method: "POST" });
      const fb = await fetch(`/api/reports/session/${sessionId}/feedback`).then(
        (r) => r.json()
      );
      setFeedback(fb);
    }
  };

  if (!session || !currentTask) return <p>Loading session...</p>;

  if (feedback) {
    return (
      <Card title="Session Complete 🎉">
        <h3 className="font-medium">Feedback</h3>
        <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
          {JSON.stringify(feedback, null, 2)}
        </pre>
      </Card>
    );
  }

  return (
    <Card title={`Session: ${session.id}`}>
      <p className="text-sm mb-2">
        Task {session.currentTaskIndex + 1} of {session.taskIds.length}
      </p>

      {currentItem ? (
        <div className="mb-3">
          <div className="font-medium mb-2">
            {currentItem.stem || currentItem.text || "Untitled Item"}
          </div>
          <textarea
            className="border p-2 w-full mb-2"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
          />
          <button
            onClick={submitAnswer}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            Submit
          </button>
        </div>
      ) : (
        <p>No item available</p>
      )}
    </Card>
  );
}
