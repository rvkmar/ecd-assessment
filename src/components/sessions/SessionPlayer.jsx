import React, { useEffect, useState, useRef } from "react";
import Modal from "../ui/Modal";

// SessionPlayer.jsx
// Runtime delivery component for a session.
// Refactor chunk 1/5:
//  - imports, core state, helpers to enrich tasks with taskModel metadata
//  - sessionId derivation and initial session+evidenceModels load


export default function SessionPlayer({ sessionId: propSessionId, onFinished }) {
  // ----- session identification -----
  const [sessionId, setSessionId] = useState(propSessionId || null);

  // ----- domain state -----
  const [session, setSession] = useState(null); // full session object from backend
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [task, setTask] = useState(null); // enriched task for currentTaskId
  const [taskModel, setTaskModel] = useState(null); // enriched taskModel for the current task
  const [question, setQuestion] = useState(null);
  const [evidenceModels, setEvidenceModels] = useState([]);

  // ----- UI state -----
  const [loading, setLoading] = useState(true);
  const [loadingTask, setLoadingTask] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [noMoreTasks, setNoMoreTasks] = useState(false);

  // Inputs / runtime state
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedRubricLevel, setSelectedRubricLevel] = useState(null);

  // deadline / countdown UI
  const [deadline, setDeadline] = useState(null); // Date object or null
  const [countdownMs, setCountdownMs] = useState(null); // ms remaining or null

  // Banners / messages / locks
  const [showResumedBanner, setShowResumedBanner] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  
  // policies cache to resolve policy name
  const [policies, setPolicies] = useState([]);

  useEffect(() => {
    fetch("/api/policies")
      .then((r) => r.json())
      .then((data) => setPolicies(data || []))
      .catch(() => setPolicies([]));
  }, []);

  const getPolicyName = (policyId) => {
    if (!policyId) return null;
    const p = (policies || []).find((pol) => pol.id === policyId);
    return p ? p.name : policyId;
  };

  // keep a ref to avoid stale closures in async helpers
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // ----- derive sessionId from URL if prop not provided -----
  useEffect(() => {
    if (propSessionId) return;
    try {
      const m = window.location.pathname.match(/\/sessions\/(s[0-9]+)\/player/);
      if (m) setSessionId(m[1]);
    } catch (e) {
      // ignore quietly
    }
  }, [propSessionId]);

  // ----- helper: fetch JSON safely -----
  async function fetchJsonSafe(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      // bubble up; callers may handle
      throw err;
    }
  }

  // ----- helper: fetch and attach taskModel to a task object -----
  // Returns a new task object with `taskModel` populated if available.
  async function enrichTaskWithModel(taskObj) {
    if (!taskObj) return taskObj;
    if (taskObj.taskModel) return taskObj; // already enriched
    if (!taskObj.taskModelId) return taskObj;

    try {
      const tm = await fetchJsonSafe(`/api/taskModels/${taskObj.taskModelId}`);
      return { ...taskObj, taskModel: tm };
    } catch (e) {
      // failed to enrich; return original task (silently)
      console.warn(`Failed to fetch taskModel ${taskObj.taskModelId}:`, e);
      return taskObj;
    }
  }

  // ----- helper: given a questionId and a (possibly enriched) taskModel,
  // find the itemMapping (if any) that links question -> observation/evidence -----
  function findItemMapping(taskModelObj, questionId) {
    if (!taskModelObj || !Array.isArray(taskModelObj.itemMappings) || !questionId) return null;
    return taskModelObj.itemMappings.find((m) => m.itemId === questionId) || null;
  }

  // ----- helper: compute session-level deadline (prefers session.endTime, else max(task.endTime)) -----
  function computeSessionDeadline(sess) {
    if (!sess) return null;
    if (sess.endTime) {
      const d = new Date(sess.endTime);
      if (!isNaN(d.getTime())) return d;
    }
    // use enriched tasks (if present) to find latest endTime
    const taskEndTimes = (sess.tasks || [])
      .map((t) => (t && t.endTime ? new Date(t.endTime) : null))
      .filter((d) => d && !isNaN(d.getTime()));
    if (taskEndTimes.length === 0) return null;
    return new Date(Math.max(...taskEndTimes.map((d) => d.getTime())));
  }

  // ----- initial load: session + evidenceModels -----
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // fetch session and evidenceModels in parallel
        const [sess, ems] = await Promise.all([
          fetchJsonSafe(`/api/sessions/${sessionId}`),
          fetch("/api/evidenceModels").then((r) => r.ok ? r.json() : []),
        ]);

        if (cancelled) return;

        setSession(sess || null);

        // enrich all tasks in the session
        let enrichedSess = sess;
        if (sess?.taskIds?.length) {
          const enrichedTasks = await Promise.all(
            sess.taskIds.map(async (tid) => {
              try {
                const t = await fetchJsonSafe(`/api/tasks/${tid}`);
                return await enrichTaskWithModel(t);
              } catch {
                return { id: tid };
              }
            })
          );
          enrichedSess = { ...sess, tasks: enrichedTasks };
        }
 
        setSession(enrichedSess || null);

        setEvidenceModels(ems || []);
      } catch (err) {
        console.error("Failed to load session or evidenceModels", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);


  useEffect(() => {
    if (!session) return;
    loadNextTask();
    // reset UI inputs
    setSelectedOptionId(null);
    setTextAnswer("");
    setSelectedRubricLevel(null);
  }, [session]);

  
  // ----- when session or its tasks change, compute deadline and start countdown -----
  useEffect(() => {
    let iv = null;
    if (!session) {
      setDeadline(null);
      setCountdownMs(null);
      return;
    }

    const d = computeSessionDeadline(session);
    setDeadline(d);

    // update countdown every 1s if deadline present and session appears in-progress
    function updateCountdown() {
      if (!d) {
        setCountdownMs(null);
        return;
      }
      const now = new Date();
      const ms = d.getTime() - now.getTime();
      setCountdownMs(ms > 0 ? ms : 0);
      // if time passed, trigger a refresh so UI picks up server-side auto-finish quickly
      if (ms <= 0) {
        // fetch updated session once
        (async () => {
          try {
            const s = await fetchJsonSafe(`/api/sessions/${sessionIdRef.current}`);
            setSession(s);
          } catch (e) {
            // ignore refresh failures
          }
        })();
      }
    }

    updateCountdown();
    if (d) iv = setInterval(updateCountdown, 1000);
    return () => {
      if (iv) clearInterval(iv);
    };
  }, [session?.tasks, session?.endTime, session?.status, sessionIdRef.current]);

  // ----- show resumed banner briefly when status flips to in-progress -----
  useEffect(() => {
    if (session?.status === "in-progress") {
      setShowResumedBanner(true);
      const timer = setTimeout(() => setShowResumedBanner(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [session?.status]);

  // ----- loadNextTask: ask backend for next-task, enrich with taskModel -----
  async function loadNextTask() {
    setLoadingTask(true);
    setNoMoreTasks(false);

    try {
      const res = await fetch(`/api/sessions/${sessionIdRef.current}/next-task`);
      const data = await res.json();

      if (!data || !data.taskId) {
        // no tasks left
        setCurrentTaskId(null);
        setTask(null);
        setQuestion(null);
        setTaskModel(null);
        setNoMoreTasks(true);
        return;
      }

      const tid = data.taskId;
      setCurrentTaskId(tid);

      // fetch the task from API
      let taskObj = null;
      try {
        taskObj = await fetchJsonSafe(`/api/tasks/${tid}`);
      } catch (e) {
        console.error("Failed to fetch activity:", e);
        setTask(null);
        setTaskModel(null);
        setQuestion(null);
        return;
      }

      // enrich with taskModel metadata
      const enrichedTask = await enrichTaskWithModel(taskObj);
      setTask(enrichedTask);
      setTaskModel(enrichedTask.taskModel || null);

      // fetch question if linked
      if (enrichedTask?.questionId) {
        try {
          const q = await fetchJsonSafe(`/api/questions/${enrichedTask.questionId}`);
          setQuestion(q || null);
        } catch {
          setQuestion(null);
        }
      } else {
        setQuestion(null);
      }
    } catch (e) {
      console.error("Failed to load next activity:", e);
    } finally {
      setLoadingTask(false);
    }
  }

  // ----- helper: find rubric levels for an observationId using evidenceModels -----
  function getRubricLevelsForObservation(obsId) {
    for (const em of evidenceModels || []) {
      const obs = (em.observations || []).find((o) => o.id === obsId);
      if (obs && obs.rubric && Array.isArray(obs.rubric.levels)) {
        return obs.rubric.levels;
      }
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentTaskId) return;
    setSubmitting(true);

    const payload = {
      taskId: currentTaskId,
    };

    if (question?.id) payload.questionId = question.id;

    // auto-map item → observation/evidence if mapping exists
    const mapping = findItemMapping(taskModel, question?.id);
    if (mapping) {
      if (mapping.observationId) payload.observationId = mapping.observationId;
      if (mapping.evidenceId) payload.evidenceId = mapping.evidenceId;
    }

    // Fill answers depending on type
    if (question?.type === "mcq") {
      payload.rawAnswer = selectedOptionId || null;
      const scored =
        selectedOptionId && question.correctOptionId === selectedOptionId ? 1 : 0;
      payload.scoredValue = scored;
    } else if (question?.type === "rubric") {
      payload.rubricLevel = selectedRubricLevel || null;
      payload.rawAnswer = textAnswer || null;
      payload.scoredValue = selectedRubricLevel || null;
    } else if (["constructed", "open"].includes(question?.type)) {
      payload.rawAnswer = textAnswer || null;
    } else {
      // fallback
      payload.rawAnswer = textAnswer || (selectedOptionId || null);
    }

    try {
      const res = await fetch(`/api/sessions/${sessionIdRef.current}/submit`, {
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

      // enrich tasks for updated session
      if (updatedSession?.taskIds?.length) {
        const enrichedTasks = await Promise.all(
          updatedSession.taskIds.map(async (tid) => {
            try {
              const t = await fetchJsonSafe(`/api/tasks/${tid}`);
              return await enrichTaskWithModel(t);
            } catch {
              return { id: tid };
            }
          })
        );
        updatedSession.tasks = enrichedTasks;
      }
      setSession(updatedSession);

      // clear inputs before next task
      setSelectedOptionId(null);
      setTextAnswer("");
      setSelectedRubricLevel(null);

      // load next task
      await loadNextTask();
    } catch (err) {
      console.error(err);
      alert("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ----- finish session -----
  async function handleFinish() {
    if (!confirm("Finish this session?")) return;
    try {
      const res = await fetch(`/api/sessions/${sessionIdRef.current}/finish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to finish session");
      const updated = await res.json();
      setSession(updated);
      setNoMoreTasks(true);
      if (onFinished) onFinished(updated);
      alert("Session finished.");
    } catch (e) {
      console.error(e);
      alert("Failed to finish session: " + e.message);
      setFinishing(false);
    }
  }

  async function confirmFinish() {
    setFinishing(true);
    try {
      const res = await fetch(`/api/sessions/${sessionIdRef.current}/finish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to finish session");
      const updated = await res.json();
      setSession(updated);
      setNoMoreTasks(true);
      if (onFinished) onFinished(updated);
    } catch (e) {
      console.error(e);
      alert("Failed to finish session: " + e.message);
      setFinishing(false);
    }
  }

  // ----- render banners -----
  let banner = null;
  // If autoFinished by backend, show auto-finished banner
  if (session?.autoFinished) {
    banner = (
      <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">
        ⚠️ This session was <strong>auto-finished</strong> by the system
        {session?.finishedAt ? ` at ${new Date(session.finishedAt).toLocaleString()}` : "."}
        <div className="text-xs text-gray-500 mt-1">Teacher can review submitted responses.</div>
      </div>
    );
  } else if (countdownMs !== null && countdownMs > 0 && (session?.status === "in-progress" || session?.status === "in-progress" || session?.status === "in_progress")) {
    // show countdown when a deadline exists and is still in-progress
    function formatMs(ms) {
      const total = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0) return `${h}h ${m}m ${s}s`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    }
    banner = (
      <div className="mb-4 p-3 rounded bg-blue-50 text-blue-800 border border-blue-100">
        ⏱ Time remaining: <strong>{formatMs(countdownMs)}</strong>
        {deadline && <div className="text-xs text-gray-500 mt-1">Deadline: {deadline.toLocaleString()}</div>}
      </div>
    );
  } else if (session?.status === "paused") {
    banner = (
      <div className="mb-4 p-3 rounded bg-orange-100 text-orange-800 border border-orange-300">
        ⚠️ This session has been <strong>paused</strong> by your teacher.
      </div>
    );
  } else if (showResumedBanner) {
    banner = (
      <div className="mb-4 p-3 rounded bg-green-100 text-green-800 border border-green-300">
        ✅ Session resumed — you may continue.
      </div>
    );
  }

  const progressTotal = (session?.taskIds || []).length || 0;
  const progressDone = (session?.responses || []).length || 0;

  if (!sessionId) return <div className="p-6">Session id not provided.</div>;
  if (loading) return <div className="p-6">Loading session...</div>;

  return (
    <div className="p-6 space-y-4">
      {banner}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Session Player: {sessionId}</h2>
          <div className="text-sm text-gray-600 mt-1">
            Student: {session && session.studentId ? session.studentId : "(unassigned)"}
          </div>
          {session?.selectionStrategy && (
            <div className="text-sm text-gray-600">
              Strategy: {session.selectionStrategy}
              {session?.nextTaskPolicy?.policyId && (
                <span className="ml-2 text-xs text-gray-500">
                  (Policy: {getPolicyName(session.nextTaskPolicy.policyId)})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="text-sm text-gray-700">
          Progress: {progressDone} / {progressTotal}
        </div>
        <div className="w-full bg-gray-200 rounded h-3 mt-1">
          <div
            className="h-3 rounded bg-blue-600"
            style={{
              width: `${
                progressTotal ? (progressDone / progressTotal) * 100 : 0
              }%`,
            }}
          />
        </div>
      </div>

      {loadingTask ? (
        <div>Loading next activity...</div>
      ) : noMoreTasks ? (
        <div className="p-4 border rounded bg-green-50">
          <p className="font-medium">No more tasks available.</p>
          <p className="text-sm text-gray-600">
            You can finish the session or review responses.
          </p>
          <div className="mt-3 space-x-2">
            {session?.status !== "completed" && (
              <button
                type="button"
                onClick={() => setFinishModalOpen(true)}
                disabled={session?.status === "paused" || finishing}
                className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50"
              >
                {finishing ? "Finishing..." : "Finish Session"}
              </button>
            )}
            <a
              href={`/api/reports/session/${sessionId}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-indigo-600 text-white rounded"
            >
              Open Report (raw JSON)
            </a>
          </div>
        </div>
      ) : task ? (
        <div className="p-4 border rounded bg-white">
          <div className="mb-3">
            <strong>Activity:</strong>{" "}
            <span className="text-sm text-gray-600">{task.id}</span>
          </div>

          {taskModel && (
            <div className="mb-3 text-sm text-gray-600">
              <div>
                <strong>Competency:</strong>{" "}
                {taskModel.competencyId || "(unknown)"}
              </div>
              <div>
                <strong>Evidence:</strong> {taskModel.evidenceId || "(unknown)"}
              </div>
              <div>
                <strong>Activity Template:</strong>{" "}
                {taskModel.name || taskModel.id || "(unnamed)"}
              </div>
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
                      <label
                        key={opt.id}
                        className="block p-2 border rounded my-1"
                      >
                        <input
                          type="radio"
                          name="mcq"
                          value={opt.id}
                          checked={selectedOptionId === opt.id}
                          onChange={() => setSelectedOptionId(opt.id)}
                          disabled={
                            // session is editable only when in-progress and not autoFinished/isCompleted
                            !(
                              session &&
                              (session.status === "in-progress" ||
                                session.status === "in_progress" ||
                                session.status === undefined) &&
                              !session.autoFinished &&
                              !session.isCompleted
                            ) || submitting
                          }
                        />{" "}
                        <span className="ml-2">{opt.text}</span>
                      </label>
                    ))}
                </div>
              )}

              {/* Rubric */}
              {question.type === "rubric" && (
                <div>
                  <div className="text-sm text-gray-700">Rubric response</div>
                  {(() => {
                    const mapping = findItemMapping(taskModel, question.id);
                    const levels = mapping?.observationId
                      ? getRubricLevelsForObservation(mapping.observationId)
                      : null;
                    if (levels) {
                      return (
                        <select
                          className="border p-2 rounded w-full"
                          value={selectedRubricLevel || ""}
                          onChange={(e) => setSelectedRubricLevel(e.target.value)}
                          disabled={
                            !(
                              session &&
                              (session.status === "in-progress" ||
                                session.status === "in_progress" ||
                                session.status === undefined) &&
                              !session.autoFinished &&
                              !session.isCompleted
                            )
                          }
                        >
                          <option value="">Select rubric level</option>
                          {levels.map((lvl, i) => (
                            <option key={i} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      );
                    }
                    return (
                      <input
                        className="border p-2 rounded w-full"
                        placeholder="Enter rubric level or comment"
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        disabled={
                          !(
                            session &&
                            (session.status === "in-progress" ||
                              session.status === "in_progress" ||
                              session.status === undefined) &&
                            !session.autoFinished &&
                            !session.isCompleted
                          )
                        }
                      />
                    );
                  })()}
                </div>
              )}

              {/* Constructed / open */}
              {["constructed", "open"].includes(question.type) && (
                <div>
                  <label className="block font-medium">Answer</label>
                  <textarea
                    rows={6}
                    className="w-full border p-2 rounded"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    disabled={
                      !(
                        session &&
                        (session.status === "in-progress" ||
                          session.status === "in_progress" ||
                          session.status === undefined) &&
                        !session.autoFinished &&
                        !session.isCompleted
                      )
                    }
                  />
                </div>
              )}

              {/* Fallback */}
              {!question.type && (
                <div>
                  <label className="block font-medium">Answer</label>
                  <input
                    className="border p-2 rounded w-full"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    disabled={
                      !(
                        session &&
                        (session.status === "in-progress" ||
                          session.status === "in_progress" ||
                          session.status === undefined) &&
                        !session.autoFinished &&
                        !session.isCompleted
                      )
                    }
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !(
                      session &&
                      (session.status === "in-progress" ||
                        session.status === "in_progress" ||
                        session.status === undefined) &&
                      !session.autoFinished &&
                      !session.isCompleted
                    )
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Submit Answer
                </button>
                <button
                  type="button"
                  onClick={loadNextTask}
                  disabled={
                    !(
                      session &&
                      (session.status === "in-progress" ||
                        session.status === "in_progress" ||
                        session.status === undefined) &&
                      !session.autoFinished &&
                      !session.isCompleted
                    )
                  }
                  className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                  Skip
                </button>
                {session?.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => setFinishModalOpen(true)}
                    disabled={
                      finishing ||
                      !(
                        session &&
                        (session.status === "in-progress" ||
                          session.status === "in_progress" ||
                          session.status === undefined) &&
                        !session.autoFinished &&
                        !session.isCompleted
                      )
                    }
                    className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50"
                  >
                    {finishing ? "Finishing..." : "Finish Session"}
                  </button>
                )}
                {session?.status === "completed" && (
                  <div className="px-3 py-1 bg-green-500 text-white rounded inline-block">
                    ✅ Session Completed
                  </div>
                )}
              </div>
            </form>
          ) : (
            <div className="text-sm text-gray-600">
              No linked question for this activity. You may capture evidence manually.
            </div>
          )}
        </div>
      ) : (
        <div>No activity loaded.</div>
      )}

      {/* Responses timeline */}
      <div>
        <h4 className="font-semibold">Responses</h4>
        {session?.responses?.length ? (
          <ul className="list-disc ml-5 text-sm">
            {session.responses.map((r, i) => {
              // try to find the enriched task for this response
              // and get competency/evidence from taskModel if available
              const t = session.tasks?.find((x) => x.id === r.taskId) || null;
              const competency = t?.taskModel?.competencyId || "?";
              const evidence = t?.taskModel?.evidenceId || "?";

              return (
                <li key={i}>
                  <div>
                    <strong>Activity:</strong> {r.taskId}{" "}
                    <span className="text-gray-500">
                      at {new Date(r.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-700">
                    Answer: {r.rawAnswer || r.rubricLevel || r.scoredValue || "(none)"}
                  </div>
                  <div className="text-gray-500 text-xs">
                    [C: {competency}, E: {evidence}]
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No responses yet.</p>
        )}
      </div>

      {/* Finish confirmation modal */}
      <Modal
        isOpen={finishModalOpen}
        onClose={() => setFinishModalOpen(false)}
        onConfirm={confirmFinish}
        title="Finish Session"
        message="Are you sure you want to finish this session? This cannot be undone."
        confirmClass="bg-red-500 hover:bg-red-600 text-white"
      />
    </div>
  );
}
