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
import Modal from "../ui/Modal";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import toast from "react-hot-toast";

export default function QuestionEditor({ notify }) {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  // const notify = (msg, type = "info") => {
  // if (type === "success") toast.success(msg);
  //   else if (type === "error") toast.error(msg);
  //   else toast(msg);
  // };
  
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    type: null,
    subQuestionIds: [],
    passageId: null,
  });

  // For reading comprehension
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [linkedSubQuestions, setLinkedSubQuestions] = useState([]);

  // Manage linked preview and expansion
  const [expandedPreview, setExpandedPreview] = useState(false);

  const toggleLinkedPreview = () => setExpandedPreview((prev) => !prev);

  const getLinkedQuestionPreview = (ids = []) =>
    availableQuestions.filter((q) => ids.includes(q.id));

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

  // Load all questions for linking sub-questions
  useEffect(() => {
    fetch("/api/questions")
      .then((res) => res.json())
      .then((data) => setAvailableQuestions(data || []))
      .catch(() => setAvailableQuestions([]));
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

  // ✅ Prepare Question for Save — schema-compliant, auto IDs + reading linkage
  function prepareQuestionForSave(q) {
    // Clone to avoid mutating React state directly
    const question = JSON.parse(JSON.stringify(q));

    // --- Helper for unique IDs ---
    const genId = (prefix = "id") =>
      `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // --- Ensure question has an ID ---
    if (!question.id || question.id.toString().trim() === "") {
      question.id = genId("q");
    }

    // --- Safe defaults ---
    question.status = ["new", "review", "active", "retired"].includes(question.status)
      ? question.status
      : "new";

    question.metadata ||= {};
    question.metadata.subject ||= "General";
    question.metadata.grade ||= "Class 6";
    question.metadata.topic ||= "Untitled";
    question.metadata.difficulty ||= "medium";

    // --- Type-specific handling ---
    switch (question.type) {
      case "mcq":
      case "msq": {
        question.options ||= [];

        // Assign unique IDs to all options
        question.options = question.options.map((opt) => ({
          id: opt.id || genId("opt"),
          text: opt.text || "Option",
          isCorrect: opt.isCorrect || false,
        }));

        // Ensure at least one valid option
        if (question.options.length === 0) {
          const newId = genId("opt");
          question.options.push({ id: newId, text: "Option 1", isCorrect: true });
        }

        // Sync correctOptionIds with valid option IDs
        const correctIds = question.options
          .filter((o) => o.isCorrect || question.correctOptionIds?.includes(o.id))
          .map((o) => o.id);

        question.correctOptionIds =
          correctIds.length > 0 ? correctIds : [question.options[0].id];
        break;
      }

      case "open":
      case "numeric":
        question.metadata.expectedAnswer ||= "To be provided";
        break;

      case "image":
        question.media ||= {};
        question.media.image ||= "placeholder.png";
        break;

      case "data":
        question.media ||= {};
        question.media.dataset ||= "data/sample.csv";
        break;

      case "reading":
        // Ensure reading passage has unique ID
        question.passageId = question.id;
        question.subQuestionIds ||= [];

        // If linked sub-questions exist, ensure they reference this passageId
        if (Array.isArray(question.subQuestionIds) && question.subQuestionIds.length > 0) {
          question.subQuestionIds = question.subQuestionIds.map((subId) =>
            subId.toString().trim()
          );
        }
        break;

      default:
        break;
    }

    // --- Cleanup extraneous empty properties ---
    if (!question.media || Object.keys(question.media).length === 0) delete question.media;
    if (!question.options?.length) delete question.options;

    return question;
  }


  const handleSave = async (q) => {
    setLoading(true);

    // ✅ Normalize the question object for schema compliance
    const prepared = prepareQuestionForSave(q);

    const method = prepared._isNew ? "POST" : "PUT";
    const url = prepared._isNew ? "/api/questions" : `/api/questions/${prepared.id}`;

    try {
      // --- 1️⃣ Save the main question (parent or child) ---
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepared),
      });
      const saved = await res.json();

      if (!res.ok) throw new Error(saved.error || res.statusText);

      // --- 2️⃣ If this is a reading passage, update all linked sub-questions ---
      if (prepared.type === "reading" && prepared.subQuestionIds?.length > 0) {
        for (const subId of prepared.subQuestionIds) {
          await fetch(`/api/questions/${subId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ passageId: saved.id }),
          });
        }
        notify?.(`📚 Linked ${prepared.subQuestionIds.length} sub-questions to this passage`);
      }

      notify?.("✅ Question saved successfully");
      setSelected(null);

      // --- 3️⃣ Refresh question list after save ---
      fetch("/api/questions")
        .then((res) => res.json())
        .then((data) => setQuestions(data || []))
        .catch(() => setQuestions([]));
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to save question: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // open delete confirmation modal (call this from delete buttons)
  const confirmDelete = (id, type = null, subQuestionIds = [], passageId = null) => {
    setDeleteModal({ open: true, id, type, subQuestionIds, passageId });
  };

  // perform actual deletion (called when modal confirmed)
  const performDelete = async () => {
    const { id, type, subQuestionIds, passageId } = deleteModal;
    if (!id) {
      setDeleteModal({ open: false, id: null, type: null, subQuestionIds: [], passageId: null });
      return;
    }

    try {
      // If this is a reading passage, unlink its sub-questions first
      if (type === "reading" && Array.isArray(subQuestionIds) && subQuestionIds.length > 0) {
        for (const subId of subQuestionIds) {
          await fetch(`/api/questions/${subId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ passageId: null }),
          });
        }
        notify?.(`🔗 Unlinked ${subQuestionIds.length} sub-questions from passage ${id}`);
      }

      // If deleting a sub-question, remove it from parent passage.subQuestionIds
      if (type !== "reading" && passageId) {
        const parentRes = await fetch(`/api/questions/${passageId}`);
        if (parentRes.ok) {
          const parent = await parentRes.json();
          if (parent?.type === "reading" && Array.isArray(parent.subQuestionIds)) {
            const updatedSubs = parent.subQuestionIds.filter((sid) => sid !== id);
            await fetch(`/api/questions/${passageId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subQuestionIds: updatedSubs }),
            });
            notify?.(`📘 Removed ${id} from passage ${passageId}`);
          }
        }
      }

      // finally delete the question
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete question ${id}`);

      // refresh local list
      const updated = questions.filter((q) => q.id !== id);
      setQuestions(updated);
      setSelected(null);

      // update stats if you have calculateStats or similar
      if (typeof calculateStats === "function") calculateStats(updated);

      notify?.("✅ Question deleted successfully");
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to delete question: " + err.message);
    } finally {
      setDeleteModal({ open: false, id: null, type: null, subQuestionIds: [], passageId: null });
    }
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

        {/* 🔹 Reading comprehension passage editor */}
        {q.type === "reading" && (
          <div className="space-y-4 border p-3 rounded-md bg-white">
            <h4 className="font-semibold text-base flex items-center justify-between">
              🧾 Reading Passage
              <button
                type="button"
                onClick={toggleLinkedPreview}
                className="text-xs text-blue-600 underline"
              >
                {expandedPreview ? "Hide Linked Preview" : "Show Linked Preview"}
              </button>
            </h4>

            {/* Passage Text */}
            <Textarea
              rows={8}
              placeholder="Paste or write the reading passage here..."
              value={q.stem}
              onChange={(e) => updateField("stem", e.target.value)}
              className="w-full border p-2 rounded"
            />

            {/* Sub-question linking */}
            <div>
              <label className="font-medium text-sm">
                Link Sub-Questions (Ctrl/Cmd for multi-select)
              </label>
              <select
                multiple
                className="w-full border p-2 rounded text-sm"
                value={linkedSubQuestions}
                onChange={(e) =>
                  setLinkedSubQuestions(
                    Array.from(e.target.selectedOptions).map((o) => o.value)
                  )
                }
              >
                {availableQuestions
                  .filter(
                    (qq) =>
                      qq.id !== q.id &&
                      qq.type !== "reading" &&
                      !qq.passageId
                  )
                  .map((qq) => (
                    <option key={qq.id} value={qq.id}>
                      {qq.metadata?.topic || "(untitled)"} —{" "}
                      {qq.stem?.slice(0, 90) || qq.id}
                    </option>
                  ))}
              </select>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    updateField("subQuestionIds", linkedSubQuestions);
                    notify?.(
                      `📚 Linked ${linkedSubQuestions.length} sub-questions to passage`
                    );
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Update Linked
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLinkedSubQuestions([]);
                    updateField("subQuestionIds", []);
                  }}
                  className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
                >
                  Clear Links
                </button>
              </div>
            </div>

            {/* Linked Sub-question preview */}
            {expandedPreview && q.subQuestionIds?.length > 0 && (
              <div className="mt-3 border-t pt-2 space-y-1">
                <h5 className="font-semibold text-sm text-gray-700 mb-2">
                  Linked Questions ({q.subQuestionIds.length})
                </h5>
                {getLinkedQuestionPreview(q.subQuestionIds).map((qq) => (
                  <Card
                    key={qq.id}
                    className="p-2 flex justify-between items-center border-l-4 border-blue-400"
                  >
                    <div className="text-sm text-gray-700 truncate">
                      ↳ {qq.stem?.slice(0, 100) || "(no text)"}
                      <span className="ml-2 text-xs text-gray-500">
                        [{qq.type}]
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected({ ...qq, _isNew: false })}
                      className="text-blue-600 underline text-xs"
                    >
                      Edit
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
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
               Add Option
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
              onClick={() => confirmDelete(q.id, q.type, q.subQuestionIds, q.passageId)}
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
             Add Question
          </button>
        </>
      )}

      {selected && renderEditor()}
      
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, type: null, subQuestionIds: [], passageId: null })}
        onConfirm={performDelete}
        title="Confirm Delete"
        message={
          deleteModal.type === "reading"
            ? `Delete passage ${deleteModal.id}? This will unlink ${deleteModal.subQuestionIds?.length || 0} sub-questions.`
            : `Delete question ${deleteModal.id}?`
        }
        confirmClass="bg-red-500 hover:bg-red-600 text-white"
      />

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
