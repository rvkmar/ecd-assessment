import React, { useState, useEffect } from "react";
import Card from "./Card";
import Modal from "./Modal";

export default function QuestionBank({ notify }) {
  const [questions, setQuestions] = useState([]);
  const [models, setModels] = useState([]);
  const [stem, setStem] = useState("");
  const [options, setOptions] = useState([]);
  const [correctOptionId, setCorrectOptionId] = useState("");
  const [type, setType] = useState("default");
  const [bnObservationId, setBnObservationId] = useState("");
  const [metadata, setMetadata] = useState({});
  const [modal, setModal] = useState({ open: false, id: null });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [metadataOpen, setMetadataOpen] = useState(false);

  // Load questions and evidence models from API
  useEffect(() => {
    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => setQuestions(data || []));

    fetch("/api/evidenceModels")
      .then((r) => r.json())
      .then((data) => setModels(data || []));
  }, []);

  const resetFormFields = () => {
    setStem("");
    setOptions([]);
    setCorrectOptionId("");
    setBnObservationId("");
    setMetadata({});
  };

  const resetForm = () => {
    resetFormFields();
    setType("default");
    setEditingQuestion(null);
    setMetadataOpen(false);
  };

  const addOrUpdateQuestion = async () => {
    if (!stem.trim()) return notify("Enter question text");

    const payload = {
      stem,
      type,
      options: type === "mcq" ? options : [],
      correctOptionId: type === "mcq" ? correctOptionId : null,
      bnObservationId: bnObservationId || null,
      metadata,
      updatedAt: new Date().toISOString(),
      createdAt: editingQuestion?.createdAt || new Date().toISOString(),
    };

    let res;
    if (editingQuestion) {
      res = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      const newQuestion = await res.json();
      if (editingQuestion) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === newQuestion.id ? newQuestion : q))
        );
        notify("Question updated.");
      } else {
        setQuestions((prev) => [...prev, newQuestion]);
        notify("Question added.");
      }
      resetForm();
    } else {
      notify("❌ Failed to save question");
    }
  };

  const removeQuestion = async (id) => {
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      notify("Question removed.");
    } else {
      notify("❌ Failed to remove question");
    }
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { id: Date.now().toString(), text: "" }]);
  };

  const updateOption = (id, text) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const startEdit = (q) => {
    setEditingQuestion(q);
    setStem(q.stem);
    setType(q.type);
    setOptions(q.options || []);
    setCorrectOptionId(q.correctOptionId || "");
    setBnObservationId(q.bnObservationId || "");
    setMetadata(q.metadata || {});
    setMetadataOpen(true);
  };

  return (
    <Card title="Question Bank">
      <select
        className="border p-2 mb-2 w-full"
        value={type}
        onChange={(e) => {
          const newType = e.target.value;
          setType(newType);
          if (newType === "default") {
            resetFormFields();
            setMetadataOpen(false);
          } else {
            setMetadataOpen(true); // auto-expand metadata
          }
        }}
      >
        <option value="default">Select question type</option>
        <option value="constructed">Constructed Response</option>
        <option value="mcq">Multiple Choice</option>
        <option value="open">Open Response</option>
        <option value="rubric">Rubric based Observation</option>
        TODO: Modify rubric based observations as per new evidence model design. Change to Observation based question.
      </select>

      {type === "default" && (
        <div className="border border-gray-200 bg-gray-50 text-gray-600 text-sm p-4 mb-4 rounded-lg">
          Choose a question type above to start creating a new question.
        </div>
      )}

      {type !== "default" && (
        <>
          <input
            className="border p-2 w-full mb-2"
            placeholder="Question stem"
            value={stem}
            onChange={(e) => setStem(e.target.value)}
          />

          {type === "mcq" && (
            <div className="mb-2">
              {options.map((o) => (
                <div key={o.id} className="flex gap-2 mb-1">
                  <input
                    className="border p-1 flex-1"
                    placeholder="Option text"
                    value={o.text}
                    onChange={(e) => updateOption(o.id, e.target.value)}
                  />
                  <input
                    type="radio"
                    name="correctOption"
                    checked={correctOptionId === o.id}
                    onChange={() => setCorrectOptionId(o.id)}
                  />
                </div>
              ))}
              <button
                onClick={addOption}
                className="px-2 py-1 bg-gray-500 text-white rounded"
              >
                + Option
              </button>
            </div>
          )}

          {type === "rubric" && (
            <select
              className="border p-2 w-full mb-2"
              value={bnObservationId}
              onChange={(e) => setBnObservationId(e.target.value)}
            >
              <option value="">Select Observation (from Evidence Models)</option>
              {models.flatMap((m) =>
                m.observations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {m.name} → {o.type}
                  </option>
                ))
              )}
            </select>
          )}

          {(type === "constructed" || type === "open") && (
            <input
              className="border p-2 w-full mb-2"
              placeholder="Expected answer"
              value={metadata.expectedAnswer || ""}
              onChange={(e) =>
                setMetadata((prev) => ({
                  ...prev,
                  expectedAnswer: e.target.value,
                }))
              }
            />
          )}

          {/* Metadata Section */}
          <details
            open={metadataOpen}
            onToggle={(e) => setMetadataOpen(e.target.open)}
            className="border p-2 mb-2 rounded bg-gray-50"
          >
            <summary className="cursor-pointer font-medium">Metadata</summary>
            <div className="mt-2">
              <div className="flex gap-2 mb-2">
                <input
                  className="border p-2 flex-1"
                  placeholder="Subject"
                  value={metadata.subject || ""}
                  onChange={(e) =>
                    setMetadata((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                />
                <input
                  className="border p-2 flex-1"
                  placeholder="Grade"
                  value={metadata.grade || ""}
                  onChange={(e) =>
                    setMetadata((prev) => ({
                      ...prev,
                      grade: e.target.value,
                    }))
                  }
                />
              </div>

              <input
                className="border p-2 w-full mb-2"
                placeholder="Topic"
                value={metadata.topic || ""}
                onChange={(e) =>
                  setMetadata((prev) => ({ ...prev, topic: e.target.value }))
                }
              />

              <input
                className="border p-2 w-full mb-2"
                placeholder="Tags (comma separated)"
                value={metadata.tags ? metadata.tags.join(", ") : ""}
                onChange={(e) =>
                  setMetadata((prev) => ({
                    ...prev,
                    tags: e.target.value.split(",").map((t) => t.trim()),
                  }))
                }
              />

              {/* Psychometrics inside Metadata */}
              <details className="mb-2">
                <summary className="cursor-pointer text-sm font-medium">
                  Psychometrics (IRT)
                </summary>
                <div className="flex gap-2 mt-2">
                  <input
                    className="border p-2 flex-1"
                    placeholder="a (discrimination)"
                    value={metadata.a || ""}
                    onChange={(e) =>
                      setMetadata((prev) => ({ ...prev, a: e.target.value }))
                    }
                  />
                  <input
                    className="border p-2 flex-1"
                    placeholder="b (difficulty)"
                    value={metadata.b || ""}
                    onChange={(e) =>
                      setMetadata((prev) => ({ ...prev, b: e.target.value }))
                    }
                  />
                  <input
                    className="border p-2 flex-1"
                    placeholder="c (guessing)"
                    value={metadata.c || ""}
                    onChange={(e) =>
                      setMetadata((prev) => ({ ...prev, c: e.target.value }))
                    }
                  />
                </div>
              </details>

              {/* Advanced JSON editor */}
              <details>
                <summary className="cursor-pointer text-sm text-gray-600">
                  Advanced (edit raw JSON)
                </summary>
                <textarea
                  className="border p-2 w-full mt-2 text-xs font-mono"
                  rows={4}
                  value={JSON.stringify(metadata, null, 2)}
                  onChange={(e) => {
                    try {
                      setMetadata(JSON.parse(e.target.value));
                    } catch {
                      notify("Invalid JSON in metadata");
                    }
                  }}
                />
              </details>
            </div>
          </details>
        </>
      )}

      <button
        onClick={addOrUpdateQuestion}
        disabled={type === "default"}
        className={`px-3 py-1 rounded text-white ${
          type === "default"
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {editingQuestion ? "Update Question" : "Add Question"}
      </button>

      {/* Saved Questions List */}
      <hr className="my-4" />

    <h3 className="text-lg font-semibold mb-2">
    Saved Questions ({questions.length})
    </h3>

    <ul className="text-sm space-y-2">
    {questions.length === 0 ? (
        <li className="text-gray-500">No questions saved yet.</li>
    ) : (
        questions.map((q) => (
        <li
            key={q.id}
            className="flex justify-between items-start border-b pb-1"
        >
            <span className="flex flex-col">
            <span>
                {q.type.toUpperCase()}: {q.stem}
                {q.type === "rubric" && q.bnObservationId
                ? ` (obs: ${q.bnObservationId})`
                : ""}
            </span>
            {q.metadata?.expectedAnswer && (
                <span className="text-gray-600 text-xs">
                Expected: {q.metadata.expectedAnswer}
                </span>
            )}
            {(q.metadata?.subject || q.metadata?.grade || q.metadata?.topic) && (
                <span className="text-gray-500 text-xs">
                {q.metadata.subject ? `Subject: ${q.metadata.subject} ` : ""}
                {q.metadata.grade ? `| Grade: ${q.metadata.grade} ` : ""}
                {q.metadata.topic ? `| Topic: ${q.metadata.topic}` : ""}
                </span>
            )}
            {q.metadata?.tags && q.metadata.tags.length > 0 && (
                <span className="text-gray-400 text-xs">
                Tags: {q.metadata.tags.join(", ")}
                </span>
            )}
            </span>
            <div className="flex gap-2">
            <button
                onClick={() => startEdit(q)}
                className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs"
            >
                Edit
            </button>
            <button
                onClick={() => setModal({ open: true, id: q.id })}
                className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
            >
                Remove
            </button>
            </div>
        </li>
        ))
    )}
    </ul>


      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null })}
        onConfirm={() => {
          const idToRemove = modal.id;
          setModal({ open: false, id: null });
          removeQuestion(idToRemove);
        }}
        title="Confirm Delete"
        message="Remove this question? Linked tasks and sessions will be updated."
      />
    </Card>
  );
}
