import React, { useState } from "react";
import Card from "./Card";
import Modal from "./Modal";
import { loadDB, saveDB, exportDB, importDB, clearDB } from "../utils/db";


export default function ItemBank({ notify }) {
  const [items, setItems] = useState(loadDB().items);
  const [draft, setDraft] = useState({
    type: "simple",
    text: "",
    correct: "",
    choices: [],
  });
  const [editItemId, setEditItemId] = useState(null);
  const [modal, setModal] = useState({ open: false, id: null });

  // add or update
  const addOrUpdateItem = () => {
    if (!draft.text.trim()) return notify("Enter question text");

    const db = loadDB();
    let newItem;

    if (draft.type === "simple") {
      if (!draft.correct.trim()) return notify("Enter correct answer");
      newItem = {
        id: editItemId || `i${Date.now()}`,
        type: "simple",
        text: draft.text,
        correct: draft.correct,
      };
    } else {
      if (draft.choices.length < 2) return notify("Add at least 2 choices");
      if (!draft.correct) return notify("Select a correct choice");
      newItem = {
        id: editItemId || `i${Date.now()}`,
        type: "mcq",
        text: draft.text,
        choices: draft.choices,
        correct: draft.correct,
      };
    }

    if (editItemId) {
      db.items = db.items.map((i) => (i.id === editItemId ? newItem : i));
      notify("Item updated.");
    } else {
      db.items.push(newItem);
      notify("Item added.");
    }
    saveDB(db);
    setItems(db.items);
    setDraft({ type: "simple", text: "", correct: "", choices: [] });
    setEditItemId(null);
  };

  const removeItem = (id) => {
    const db = loadDB();
    db.items = db.items.filter((i) => i.id !== id);
    db.tasks = db.tasks.filter((t) => !t.itemIds.includes(id));
    db.sessions = db.sessions.filter((s) => !Object.keys(s.responses).includes(id));
    saveDB(db);
    setItems(db.items);
    notify("Item removed.");
  };

  const addChoice = () => {
    setDraft({
      ...draft,
      choices: [...draft.choices, { id: `c${Date.now()}`, text: "" }],
    });
  };

  const updateChoice = (id, text) => {
    setDraft({
      ...draft,
      choices: draft.choices.map((c) => (c.id === id ? { ...c, text } : c)),
    });
  };

  const removeChoice = (id) => {
    setDraft({
      ...draft,
      choices: draft.choices.filter((c) => c.id !== id),
      correct: draft.correct === id ? "" : draft.correct,
    });
  };

  return (
    <Card title="Item Bank">
      <div className="space-y-2">
        <select
          className="border p-2 w-full"
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value })}
        >
          <option value="simple">Constructed Response Question</option>
          <option value="mcq">Multiple Choice Question</option>
        </select>

        <input
          className="border p-2 w-full"
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder="Question text"
        />

        {draft.type === "simple" ? (
          <input
            className="border p-2 w-full"
            value={draft.correct}
            onChange={(e) => setDraft({ ...draft, correct: e.target.value })}
            placeholder="Correct answer"
          />
        ) : (
          <div>
            <p className="text-sm font-medium">Choices:</p>
            {draft.choices.map((c) => (
              <div key={c.id} className="flex gap-2 mb-1">
                <input
                  className="border p-1 flex-1"
                  value={c.text}
                  onChange={(e) => updateChoice(c.id, e.target.value)}
                  placeholder="Choice text"
                />
                <input
                  type="radio"
                  checked={draft.correct === c.id}
                  onChange={() => setDraft({ ...draft, correct: c.id })}
                  title="Mark correct"
                />
                <button
                  onClick={() => removeChoice(c.id)}
                  className="px-2 bg-red-500 text-white rounded"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addChoice}
              className="px-2 py-1 bg-gray-200 rounded text-sm"
            >
              + Add Choice
            </button>
          </div>
        )}

        <button
          onClick={addOrUpdateItem}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          {editItemId ? "Update" : "Add"}
        </button>
      </div>

      <ul className="mt-2 text-sm space-y-1">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between items-center gap-2">
            <span>
              {i.text}{" "}
              {i.type === "simple"
                ? `(Answer: ${i.correct})`
                : `(MCQ: ${i.choices.length} choices)`}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setDraft({ ...i });
                  setEditItemId(i.id);
                }}
                className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs"
              >
                Edit
              </button>
              <button
                onClick={() => setModal({ open: true, id: i.id })}
                className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null })}
        onConfirm={() => {
          removeItem(modal.id);
          setModal({ open: false, id: null });
        }}
        title="Confirm Delete"
        message="Remove this item?"
      />
    </Card>
  );
}
