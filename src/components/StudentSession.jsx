import React, { useState, useEffect } from "react";
import Card from "./Card";
import Modal from "./Modal";
import { loadDB, saveDB } from "../utils/db";

export default function StudentSession({ task, onFinish }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const db = loadDB();
  const items = db.items.filter((i) => task.itemIds.includes(i.id));
  const model = db.evidenceModels.find((m) => m.id === task.evidenceModelId);

  useEffect(() => {
    const session = db.sessions.find((s) => s.taskId === task.id && !s.isCompleted);
    if (session) {
      setAnswers(session.responses || {});
      setCurrentTaskIndex(session.currentTaskIndex || 0);
    }
  }, []);

  const goToNextTask = async () => {
    try {
      const res = await fetch(`/api/sessions/${task.id}/next-task`);
      if (res.ok) {
        const next = await res.json();
        if (next && next.taskId) {
          const nextIndex = items.findIndex((it) => it.id === next.taskId);
          if (nextIndex >= 0) {
            setCurrentTaskIndex(nextIndex);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Adaptive sequencing not available, fallback to sequential.");
    }

    if (currentTaskIndex + 1 < items.length) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else {
      finishSession();
    }
  };

  const finishSession = () => {
    let score = 0;
    let constructScores = {};
    let scoresArray = [];

    items.forEach((it) => {
      const ans = answers[it.id];

      if (it.type === "simple" || it.type === "mcq") {
        const correct = ans === it.correct;
        if (correct) {
          score++;
          model.constructs.forEach((c) => {
            constructScores[c.text] = (constructScores[c.text] || 0) + 1;
            scoresArray.push({ constructId: c.id, value: 1 });
          });
        } else {
          model.constructs.forEach((c) => {
            scoresArray.push({ constructId: c.id, value: 0 });
          });
        }
      }

      if (it.type === "rubric") {
        const rubric = model.rubrics.find((r) => r.observationId === it.observationId);
        if (rubric) {
          const selectedLevel = rubric.levels.find((lvl) => lvl.level === Number(ans));
          if (selectedLevel) {
            const value = selectedLevel.level / rubric.levels.length;
            score += value;
            model.constructs.forEach((c) => {
              scoresArray.push({ constructId: c.id, value });
            });
          }
        }
      }
    });

    db.sessions.push({
      id: `s${Date.now()}`,
      taskId: task.id,
      responses: answers,
      score,
      constructScores,
      scores: scoresArray,
      currentTaskIndex,
      isCompleted: true,
    });

    saveDB(db);

    setResult({ score, total: items.length });
    setFeedback({
      constructs: Object.keys(constructScores).map((c) => ({
        name: c,
        score: constructScores[c] / items.length,
        level: constructScores[c] > items.length / 2 ? "Strong" : "Needs Work",
      })),
      recommendations: ["Review weak constructs", "Practice more tasks"],
    });
  };

  const submit = () => {
    const session = db.sessions.find((s) => s.taskId === task.id && !s.isCompleted);
    if (session) {
      session.responses = answers;
      session.currentTaskIndex = currentTaskIndex;
      saveDB(db);
    }

    goToNextTask();
  };

  return (
    <Card title={`Task: ${task.title}`}>
      <p className="text-sm mb-4">
        Progress: Task {currentTaskIndex + 1} of {items.length}
      </p>

      {items.map((it, idx) => {
        if (idx !== currentTaskIndex) return null;

        if (it.type === "simple") {
          return (
            <div key={it.id} className="mb-3">
              <div className="font-medium mb-1">{it.text}</div>
              <input
                className="border p-1 w-full"
                value={answers[it.id] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [it.id]: e.target.value })
                }
                placeholder="Your answer"
              />
            </div>
          );
        }

        if (it.type === "mcq") {
          return (
            <div key={it.id} className="mb-3">
              <div className="font-medium mb-1">{it.text}</div>
              {it.choices.map((c) => (
                <label key={c.id} className="block text-sm">
                  <input
                    type="radio"
                    name={it.id}
                    checked={answers[it.id] === c.id}
                    onChange={() => setAnswers({ ...answers, [it.id]: c.id })}
                  />{" "}
                  {c.text}
                </label>
              ))}
            </div>
          );
        }

        if (it.type === "rubric") {
          const rubric = model.rubrics.find((r) => r.observationId === it.observationId);
          return (
            <div key={it.id} className="mb-3">
              <div className="font-medium mb-1">{it.text}</div>
              {rubric ? (
                <select
                  className="border p-2 w-full"
                  value={answers[it.id] || ""}
                  onChange={(e) =>
                    setAnswers({ ...answers, [it.id]: e.target.value })
                  }
                >
                  <option value="">Select rubric level</option>
                  {rubric.levels.map((lvl) => (
                    <option key={lvl.level} value={lvl.level}>
                      Level {lvl.level}: {lvl.description}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500">
                  ⚠️ No rubric defined for this observation
                </p>
              )}
            </div>
          );
        }

        return null;
      })}

      <button
        onClick={submit}
        className="px-3 py-1 bg-green-500 text-white rounded"
      >
        {currentTaskIndex + 1 < items.length ? "Next" : "Finish"}
      </button>

      <Modal
        isOpen={!!result}
        onClose={() => setResult(null)}
        onConfirm={() => {
          setResult(null);
          onFinish();
        }}
        title="Assessment Complete"
        message={
          result
            ? `You scored ${result.score.toFixed(2)} out of ${result.total}.` +
              (feedback
                ? "\n" +
                  feedback.constructs
                    .map((c) => `${c.name}: ${Math.round(c.score * 100)}% (${c.level})`)
                    .join("; ")
                : "")
            : ""
        }
        confirmClass="bg-green-500 hover:bg-green-600 text-white"
      />
    </Card>
  );
}
