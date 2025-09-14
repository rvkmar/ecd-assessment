import React, { useState } from "react";
import Card from "./Card";
import Modal from "./Modal";
import { loadDB, saveDB } from "../utils/db";

export default function StudentSession({ task, onFinish }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null); // <-- store result for modal
  const items = loadDB().items.filter((i) => task.itemIds.includes(i.id));

  const submit = () => {
    const db = loadDB();
    let score = 0;
    let constructScores = {};
    const model = db.evidenceModels.find((m) => m.id === task.evidenceModelId);

    items.forEach((it) => {
      const ans = answers[it.id];
      let correct = false;

      if (it.type === "simple") {
        correct = ans?.trim().toLowerCase() === it.correct.trim().toLowerCase();
      } else if (it.type === "mcq") {
        correct = ans === it.correct;
      }

      if (correct) {
        score++;
        model.constructs.forEach((c) => {
          constructScores[c] = (constructScores[c] || 0) + 1;
        });
      }
    });

    db.sessions.push({
      id: `s${Date.now()}`,
      taskId: task.id,
      responses: answers,
      score,
      constructScores,
    });
    saveDB(db);

    // instead of alert, show modal
    setResult({ score, total: items.length });
  };

  return (
    <Card title={`Task: ${task.title}`}>
      {items.map((it) => (
        <div key={it.id} className="mb-3">
          <div className="font-medium mb-1">{it.text}</div>
          {it.type === "simple" ? (
            <input
              className="border p-1 w-full"
              value={answers[it.id] || ""}
              onChange={(e) =>
                setAnswers({ ...answers, [it.id]: e.target.value })
              }
              placeholder="Your answer"
            />
          ) : (
            it.choices.map((c) => (
              <label key={c.id} className="block text-sm">
                <input
                  type="radio"
                  name={it.id}
                  checked={answers[it.id] === c.id}
                  onChange={() => setAnswers({ ...answers, [it.id]: c.id })}
                />{" "}
                {c.text}
              </label>
            ))
          )}
        </div>
      ))}
      <button
        onClick={submit}
        className="px-3 py-1 bg-green-500 text-white rounded"
      >
        Submit
      </button>

      {/* Result Modal */}
      <Modal
        isOpen={!!result}
        onClose={() => setResult(null)}
        onConfirm={() => {
          setResult(null);
          onFinish(); // exit session after confirm
        }}
        title="Assessment Complete"
        message={
          result
            ? `You scored ${result.score} out of ${result.total}.`
            : ""
        }
      />
    </Card>
  );
}
