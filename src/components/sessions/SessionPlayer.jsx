import React, { useEffect, useState } from "react";

// SessionPlayer.jsx
// Runtime delivery component for a session.
// Props:
// - sessionId (optional). If not provided, component will attempt to read from URL (/sessions/:id/player)
// - onFinished (optional) callback when session is finished
//
// Behavior:
// 1. Load session via GET /api/sessions/:id
// 2. Ask backend for next task via GET /api/sessions/:id/next-task
// 3. For the returned taskId, fetch /api/tasks/:id and linked question (/api/questions/:id) + taskModel
// 4. Render UI for question types: mcq, constructed/open, rubric (best-effort)
// 5. Submit via POST /api/sessions/:id/submit with fields expected by backend
// 6. Repeat until no next task; allow finishing session via POST /api/sessions/:id/finish

export default function SessionPlayer({ sessionId: propSessionId, onFinished }) {
  const [sessionId, setSessionId] = useState(propSessionId || null);
  const [session, setSession] = useState(null);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [task, setTask] = useState(null);
  const [taskModel, setTaskModel] = useState(null);
  const [question, setQuestion] = useState(null);
  const [evidenceModels, setEvidenceModels] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingTask, setLoadingTask] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [noMoreTasks, setNoMoreTasks] = useState(false);

  // UI inputs
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedRubricLevel, setSelectedRubricLevel] = useState(null);

  // derive sessionId from URL if not passed
  useEffect(() => {
    if (propSessionId) return;
    try {
      const m = window.location.pathname.match(/\/sessions\/(s[0-9]+)\/player/);
      if (m) setSessionId(m[1]);
    } catch (e) {
      // ignore
    }
  }, [propSessionId]);

  // Load session and evidence models
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/sessions/${sessionId}`).then((r) => r.json()),
      fetch(`/api/evidenceModels`).then((r) => r.json()).catch(() => []),
    ])
      .then(([sess, ems]) => {
        setSession(sess || null);
        setEvidenceModels(ems || []);
      })
      .catch((err) => {
        console.error("Failed to load session or evidenceModels", err);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Load next task whenever session updates
  useEffect(() => {
    if (!session) return;
    loadNextTask();
    // reset UI inputs
    setSelectedOptionId(null);
    setTextAnswer("");
    setSelectedRubricLevel(null);
  }, [session]);

  async function loadNextTask() {
    setLoadingTask(true);
    setNoMoreTasks(false);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/next-task`);
      const data = await res.json();
      if (!data || !data.taskId) {
        setCurrentTaskId(null);
        setTask(null);
        setQuestion(null);
        setTaskModel(null);
        setNoMoreTasks(true);
        return;
      }

      const tid = data.taskId;
      setCurrentTaskId(tid);

      // fetch task, question, taskModel
      const [taskRes, taskModelRes] = await Promise.all([
        fetch(`/api/tasks/${tid}`).then((r) => r.json()),
        // task object has taskModelId
        // If taskModelId unavailable, then taskModel fetch will fail gracefully
      ]);

      setTask(taskRes || null);

      if (taskRes?.taskModelId) {
        try {
          const tm = await fetch(`/api/taskModels/${taskRes.taskModelId}`).then((r) => r.json());
          setTaskModel(tm || null);
        } catch (e) {
          setTaskModel(null);
        }
      }

      if (taskRes?.questionId) {
        try {
          const q = await fetch(`/api/questions/${taskRes.questionId}`);
          if (q.ok) setQuestion(await q.json());
          else setQuestion(null);
        } catch {
          setQuestion(null);
        }
      } else {
        setQuestion(null);
      }
    } catch (e) {
      console.error("Failed to load next task", e);
    } finally {
      setLoadingTask(false);
    }
  }

  // Helper: find item mapping for given question id inside taskModel
  function findItemMappingForQuestion(qid) {
    if (!taskModel || !taskModel.itemMappings) return null;
    return taskModel.itemMappings.find((m) => m.itemId === qid) || null;
  }

  // Helper: find rubric levels for observationId by searching evidenceModels
  function getRubricLevelsForObservation(obsId) {
    for (const em of evidenceModels || []) {
      const obs = (em.observations || []).find((o) => o.id === obsId);
      if (obs && obs.rubric && Array.isArray(obs.rubric.levels)) return obs.rubric.levels;
    }
    return null;
  }

  // Submission handler
  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentTaskId) return;
    setSubmitting(true);

    // Build submission fields
    const payload = {
      taskId: currentTaskId,
    };

    if (question?.id) payload.questionId = question.id;

    // Auto-map item → observation/evidence if mapping exists
    const mapping = question?.id ? findItemMappingForQuestion(question.id) : null;
    if (mapping) {
      if (mapping.observationId) payload.observationId = mapping.observationId;
      if (mapping.evidenceId) payload.evidenceId = mapping.evidenceId;
    }

    // Fill raw answers / scoring depending on type
    if (question?.type === "mcq") {
      payload.rawAnswer = selectedOptionId || null;
      // simple binary scoring
      const scored = selectedOptionId && question.correctOptionId === selectedOptionId ? 1 : 0;
      payload.scoredValue = scored;
    } else if (question?.type === "rubric") {
      // rubricLevel preferred (string)
      payload.rubricLevel = selectedRubricLevel || null;
      payload.rawAnswer = textAnswer || null;
      payload.scoredValue = selectedRubricLevel || null;
    } else if (["constructed", "open"].includes(question?.type)) {
      payload.rawAnswer = textAnswer || null;
      // scoring left null for teacher later; backend may accept scoredValue
    } else {
      // fallback: send whatever text user typed
      payload.rawAnswer = textAnswer || (selectedOptionId || null);
    }

    try {
      const res = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Submit failed (status ${res.status})`);
      }

      const updatedSession = await res.json();
      setSession(updatedSession);

      // Clear UI inputs for next task
      setSelectedOptionId(null);
      setTextAnswer("");
      setSelectedRubricLevel(null);

      // Ask backend for next task
      await loadNextTask();
    } catch (err) {
      console.error(err);
      alert("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish() {
    if (!confirm("Finish this session?")) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/finish`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to finish session");
      const updated = await res.json();
      setSession(updated);
      setNoMoreTasks(true);
      if (onFinished) onFinished(updated);
      alert("Session finished.");
    } catch (e) {
      console.error(e);
      alert("Failed to finish session: " + e.message);
    }
  }

  if (!sessionId) return <div className="p-6">Session id not provided in props or URL.</div>;
  if (loading) return <div className="p-6">Loading session...</div>;

  const progressTotal = (session?.taskIds || []).length || 0;
  const progressDone = (session?.responses || []).length || 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Session Player: {sessionId}</h2>
        <div className="text-sm text-gray-600">Student: {session?.studentId || "(unassigned)"}</div>
      </div>

      {/* Progress */}
      <div>
        <div className="text-sm text-gray-700">Progress: {progressDone} / {progressTotal}</div>
        <div className="w-full bg-gray-200 rounded h-3 mt-1">
          <div className="h-3 rounded bg-blue-600" style={{ width: `${progressTotal ? (progressDone / progressTotal) * 100 : 0}%` }} />
        </div>
      </div>

      {loadingTask ? (
        <div>Loading next task...</div>
      ) : noMoreTasks ? (
        <div className="p-4 border rounded bg-green-50">
          <p className="font-medium">No more tasks available for this session.</p>
          <p className="text-sm text-gray-600">You can finish the session or review responses.</p>
          <div className="mt-3 space-x-2">
            <button onClick={handleFinish} className="px-3 py-1 bg-green-600 text-white rounded">Finish Session</button>
            <a href={`/api/reports/session/${sessionId}`} target="_blank" rel="noreferrer" className="px-3 py-1 bg-indigo-600 text-white rounded">Open Report (raw JSON)</a>
          </div>
        </div>
      ) : task ? (
        <div className="p-4 border rounded bg-white">
          <div className="mb-3">
            <strong>Task:</strong> <span className="text-sm text-gray-600">{task.id}</span>
          </div>

          {taskModel && (
            <div className="mb-3 text-sm text-gray-600">
              <div><strong>Task Model:</strong> {taskModel.name || taskModel.id}</div>
              <div><strong>Difficulty:</strong> {taskModel.difficulty || '-'}</div>
            </div>
          )}

          {question ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <div className="font-medium">Question</div>
                <div className="mt-1 text-gray-800">{question.stem}</div>
              </div>

              {/* MCQ */}
              {question.type === "mcq" && (
                <div>
                  {(question.options || []).map((opt) => (
                    <label key={opt.id} className="block p-2 border rounded my-1">
                      <input type="radio" name="mcq" value={opt.id} checked={selectedOptionId === opt.id} onChange={() => setSelectedOptionId(opt.id)} />{' '}
                      <span className="ml-2">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Rubric */}
              {question.type === "rubric" && (
                <div>
                  <div className="text-sm text-gray-700">Rubric response</div>
                  {/* try to find mapping to observation and show levels */}
                  {(() => {
                    const mapping = findItemMappingForQuestion(question.id);
                    const levels = mapping?.observationId ? getRubricLevelsForObservation(mapping.observationId) : null;
                    if (levels) {
                      return (
                        <select className="border p-2 rounded w-full" value={selectedRubricLevel || ""} onChange={(e) => setSelectedRubricLevel(e.target.value)}>
                          <option value="">Select rubric level</option>
                          {levels.map((lvl, i) => (
                            <option key={i} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                      );
                    }
                    // fallback: free-text rubric level
                    return (
                      <input className="border p-2 rounded w-full" placeholder="Enter rubric level or comment" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} />
                    );
                  })()}
                </div>
              )}

              {/* Constructed / open */}
              {(["constructed", "open"].includes(question.type)) && (
                <div>
                  <label className="block font-medium">Answer</label>
                  <textarea rows={6} className="w-full border p-2 rounded" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} />
                </div>
              )}

              {/* Fallback for questions without type/item */}
              {!question.type && (
                <div>
                  <label className="block font-medium">Answer</label>
                  <input className="border p-2 rounded w-full" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Submit Answer</button>
                <button type="button" onClick={loadNextTask} className="px-4 py-2 bg-gray-200 rounded">Skip</button>
                <button type="button" onClick={handleFinish} className="px-4 py-2 bg-red-500 text-white rounded">Finish Session</button>
              </div>
            </form>
          ) : (
            <div className="text-sm text-gray-600">No linked question for this task. You may capture observation/evidence manually.</div>
          )}
        </div>
      ) : (
        <div>No task loaded.</div>
      )}

      {/* Responses timeline */}
      <div>
        <h4 className="font-semibold">Responses</h4>
        {session?.responses?.length ? (
          <ul className="list-disc ml-5 text-sm">
            {session.responses.map((r, i) => (
              <li key={i}>
                <div><strong>Task:</strong> {r.taskId} <span className="text-gray-500">at {new Date(r.timestamp).toLocaleString()}</span></div>
                <div className="text-gray-700">Answer: {r.rawAnswer || r.rubricLevel || r.scoredValue || "(none)"}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No responses yet.</p>
        )}
      </div>
    </div>
  );
}
