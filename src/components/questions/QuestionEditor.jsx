import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function QuestionEditor({ notify }) {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  // dropdown presets
  const subjects = ["Mathematics", "Science", "English", "Social Science"];
  const grades = [
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
  ];
  const bloomLevels = [
    "Remember",
    "Understand",
    "Apply",
    "Analyze",
    "Evaluate",
    "Create",
  ];
  const soloLevels = [
    "Prestructural",
    "Unistructural",
    "Multistructural",
    "Relational",
    "Extended Abstract",
  ];
  const difficulties = ["easy", "medium", "hard"];
  const statuses = ["new", "review", "active", "retired"];
  const types = [
    "mcq",
    "msq",
    "open",
    "numeric",
    "equation",
    "image",
    "audio",
    "video",
    "reading",
    "data",
    "rubric",
    "ordering",
    "matching",
  ];

  // load questions
  useEffect(() => {
    fetch("/api/questions")
      .then((res) => res.json())
      .then((data) => setQuestions(data || []))
      .catch(() => setQuestions([]));
  }, []);

  const blankQuestion = () => ({
    id: `q${Date.now()}`,
    type: "mcq",
    stem: "",
    options: [],
    correctOptionIds: [],
    media: {},
    metadata: {
      subject: "",
      grade: "",
      topic: "",
      tags: [],
      difficulty: "medium",
      bloomLevel: "",
      soloLevel: "",
      expectedAnswer: "",
      source: "",
      interactionType: "",
      dataSchema: {},
    },
    status: "new",
  });

  const handleSave = async (q) => {
    setLoading(true);
    const method = q._isNew ? "POST" : "PUT";
    const url = q._isNew ? "/api/questions" : `/api/questions/${q.id}`;
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(q),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || res.statusText);
      notify?.("✅ Question saved");
      setSelected(null);
      // refresh list
      fetch("/api/questions")
        .then((res) => res.json())
        .then((data) => setQuestions(data || []));
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to save question");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    setQuestions(questions.filter((q) => q.id !== id));
    setSelected(null);
  };

  const updateField = (k, v) => setSelected({ ...selected, [k]: v });
  const updateMeta = (k, v) =>
    setSelected({ ...selected, metadata: { ...selected.metadata, [k]: v } });

  const addOption = () =>
    setSelected({
      ...selected,
      options: [
        ...(selected.options || []),
        { id: `opt${Date.now()}`, text: "", isCorrect: false },
      ],
    });

  const updateOption = (id, patch) => {
    const updated = selected.options.map((o) =>
      o.id === id ? { ...o, ...patch } : o
    );
    setSelected({ ...selected, options: updated });
  };

  const removeOption = (id) => {
    setSelected({
      ...selected,
      options: selected.options.filter((o) => o.id !== id),
    });
  };

  const toggleCorrect = (id) => {
    const list = selected.correctOptionIds || [];
    const exists = list.includes(id);
    const newList = exists ? list.filter((x) => x !== id) : [...list, id];
    setSelected({ ...selected, correctOptionIds: newList });
  };

  const renderEditor = () => {
    if (!selected) return null;
    const q = selected;

    return (
      <div className="p-4 border rounded-md space-y-4 bg-gray-50 shadow-sm">
        <h3 className="text-lg font-semibold">
          {q._isNew ? "New Question" : `Editing: ${q.id}`}
        </h3>

        {/* Question Type */}
        <div>
          <label className="font-medium text-sm">Type</label>
          <select
            value={q.type}
            onChange={(e) => updateField("type", e.target.value)}
            className="w-full border p-2 rounded text-sm"
          >
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Stem */}
        <div>
          <label className="font-medium text-sm">Stem / Prompt</label>
          <Textarea
            rows={3}
            value={q.stem}
            onChange={(e) => updateField("stem", e.target.value)}
          />
        </div>

        {/* Options for MCQ/MSQ */}
        {["mcq", "msq"].includes(q.type) && (
          <div className="space-y-2">
            <h4 className="font-medium">Options</h4>
            {(q.options || []).map((opt) => (
              <div
                key={opt.id}
                className="flex items-center space-x-2 border p-2 rounded bg-white"
              >
                <Checkbox
                  checked={q.correctOptionIds?.includes(opt.id)}
                  onCheckedChange={() => toggleCorrect(opt.id)}
                />
                <Input
                  value={opt.text}
                  onChange={(e) =>
                    updateOption(opt.id, { text: e.target.value })
                  }
                  placeholder="Option text"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeOption(opt.id)}
                  className="text-red-500 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="bg-blue-600 text-white px-3 py-1 rounded"
              onClick={addOption}
            >
              + Add Option
            </button>
          </div>
        )}

        {/* Media */}
        {["image", "audio", "video", "data"].includes(q.type) && (
          <div className="space-y-2">
            <h4 className="font-medium">Media Attachments</h4>
            <div className="grid grid-cols-2 gap-2">
              {q.type === "image" && (
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    updateField("media", {
                      ...q.media,
                      image: e.target.files[0]?.name,
                    })
                  }
                />
              )}
              {q.type === "audio" && (
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) =>
                    updateField("media", {
                      ...q.media,
                      audio: e.target.files[0]?.name,
                    })
                  }
                />
              )}
              {q.type === "video" && (
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) =>
                    updateField("media", {
                      ...q.media,
                      video: e.target.files[0]?.name,
                    })
                  }
                />
              )}
              {q.type === "data" && (
                <Input
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) =>
                    updateField("media", {
                      ...q.media,
                      dataset: e.target.files[0]?.name,
                    })
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2 border-t pt-3">
          <h4 className="font-medium">Metadata</h4>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Subject"
              value={q.metadata.subject}
              options={subjects}
              onChange={(v) => updateMeta("subject", v)}
            />
            <SelectField
              label="Grade"
              value={q.metadata.grade}
              options={grades}
              onChange={(v) => updateMeta("grade", v)}
            />
            <Input
              label="Topic"
              placeholder="Topic"
              value={q.metadata.topic}
              onChange={(e) => updateMeta("topic", e.target.value)}
            />
            <SelectField
              label="Difficulty"
              value={q.metadata.difficulty}
              options={difficulties}
              onChange={(v) => updateMeta("difficulty", v)}
            />
            <SelectField
              label="Bloom Level"
              value={q.metadata.bloomLevel}
              options={bloomLevels}
              onChange={(v) => updateMeta("bloomLevel", v)}
            />
            <SelectField
              label="SOLO Level"
              value={q.metadata.soloLevel}
              options={soloLevels}
              onChange={(v) => updateMeta("soloLevel", v)}
            />
            <Input
              label="Expected Answer"
              value={q.metadata.expectedAnswer}
              onChange={(e) => updateMeta("expectedAnswer", e.target.value)}
            />
            <Input
              label="Source"
              value={q.metadata.source}
              onChange={(e) => updateMeta("source", e.target.value)}
            />
          </div>
        </div>

        {/* Lifecycle */}
        <div>
          <label className="font-medium text-sm">Status</label>
          <select
            value={q.status}
            onChange={(e) => updateField("status", e.target.value)}
            className="w-full border p-2 rounded text-sm"
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          {/* quick transitions */}
          <div className="mt-2 space-x-2">
            <button
              type="button"
              onClick={() => updateField("status", "active")}
              className="bg-green-600 text-white px-2 py-1 rounded"
            >
              Mark Active
            </button>
            <button
              type="button"
              onClick={() => updateField("status", "retired")}
              className="bg-gray-600 text-white px-2 py-1 rounded"
            >
              Archive
            </button>
          </div>
        </div>

        {/* Save/Delete */}
        <div className="flex justify-end space-x-2 pt-3 border-t">
          <button
            type="button"
            className="px-3 py-1 bg-gray-500 text-white rounded"
            onClick={() => setSelected(null)}
          >
            Cancel
          </button>
          {!q._isNew && (
            <button
              type="button"
              className="px-3 py-1 bg-red-600 text-white rounded"
              onClick={() => handleDelete(q.id)}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="px-3 py-1 bg-blue-600 text-white rounded"
            disabled={loading}
            onClick={() => handleSave(q)}
          >
            {loading ? "Saving..." : "Save Question"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Question Bank</h2>

      {!selected && (
        <>
          {questions.length === 0 && (
            <p className="text-gray-500 text-sm">No questions added yet.</p>
          )}
          <ul className="space-y-2">
            {questions.map((q) => (
              <li
                key={q.id}
                className="border p-3 rounded bg-white flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{q.stem}</div>
                  <div className="text-xs text-gray-500">
                    {q.type} | {q.metadata?.subject} | {q.metadata?.grade} |{" "}
                    <span className="font-semibold">{q.status}</span>
                  </div>
                </div>
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                  onClick={() => setSelected({ ...q, _isNew: false })}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>

          <button
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => setSelected({ ...blankQuestion(), _isNew: true })}
          >
            + Add Question
          </button>
        </>
      )}

      {selected && renderEditor()}
    </div>
  );
}

// helper: Select dropdown
function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="font-medium text-sm">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border p-2 rounded text-sm"
      >
        <option value="">-- select --</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
