import React, { useState, useEffect } from "react";
import Card from "./Card";
import Modal from "./Modal";

export default function ItemBank({ notify }) {
  const [items, setItems] = useState([]);
  const [models, setModels] = useState([]);
  const [text, setText] = useState("");
  const [choices, setChoices] = useState([]);
  const [correct, setCorrect] = useState("");
  const [type, setType] = useState("simple");
  const [observationId, setObservationId] = useState("");
  const [modal, setModal] = useState({ open: false, id: null });
  const [editingItem, setEditingItem] = useState(null);

  // Load items and evidence models from API
  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => setItems(data || []));

    fetch("/api/evidenceModels")
      .then((r) => r.json())
      .then((data) => setModels(data || []));
  }, []);

  const resetForm = () => {
    setText("");
    setChoices([]);
    setCorrect("");
    setType("simple");
    setObservationId("");
    setEditingItem(null);
  };

  const addOrUpdateItem = async () => {
    if (!text.trim()) return notify("Enter item text");

    const payload = {
      text,
      type,
      choices: type === "mcq" ? choices : [],
      correct,
      observationId: type === "rubric" ? observationId : null,
    };

    let res;
    if (editingItem) {
      res = await fetch(`/api/items/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      const newItem = await res.json();
      if (editingItem) {
        setItems((prev) => prev.map((i) => (i.id === newItem.id ? newItem : i)));
        notify("Item updated.");
      } else {
        setItems((prev) => [...prev, newItem]);
        notify("Item added.");
      }
      resetForm();
    } else {
      notify("❌ Failed to save item");
    }
  };

  const removeItem = async (id) => {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((it) => it.id !== id));
      notify("Item removed.");
    } else {
      notify("❌ Failed to remove item");
    }
  };

  const addChoice = () => {
    setChoices((prev) => [...prev, { id: Date.now().toString(), text: "" }]);
  };

  const updateChoice = (id, text) => {
    setChoices((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setText(item.text);
    setType(item.type);
    setChoices(item.choices || []);
    setCorrect(item.correct || "");
    setObservationId(item.observationId || "");
  };

  return (
    <Card title="Item Bank">
      <select
        className="border p-2 mb-2 w-full"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="simple">Constructed Response</option>
        <option value="mcq">Multiple Choice</option>
        <option value="rubric">Rubric based Observation</option>
      </select>

      <input
        className="border p-2 w-full mb-2"
        placeholder="Item text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {type === "mcq" && (
        <div className="mb-2">
          {choices.map((c) => (
            <div key={c.id} className="flex gap-2 mb-1">
              <input
                className="border p-1 flex-1"
                placeholder="Choice text"
                value={c.text}
                onChange={(e) => updateChoice(c.id, e.target.value)}
              />
              <input
                type="radio"
                name="correct"
                checked={correct === c.id}
                onChange={() => setCorrect(c.id)}
              />
            </div>
          ))}
          <button
            onClick={addChoice}
            className="px-2 py-1 bg-gray-500 text-white rounded"
          >
            + Choice
          </button>
        </div>
      )}

      {type === "simple" && (
        <input
          className="border p-2 w-full mb-2"
          placeholder="Correct answer"
          value={correct}
          onChange={(e) => setCorrect(e.target.value)}
        />
      )}

      {type === "rubric" && (
        <select
          className="border p-2 w-full mb-2"
          value={observationId}
          onChange={(e) => setObservationId(e.target.value)}
        >
          <option value="">Select Observation (from Evidence Models)</option>
          {models.flatMap((m) =>
            m.constructs.map((c) => (
              <option key={c.id} value={c.id}>
                {m.name} → {c.text}
              </option>
            ))
          )}
        </select>
      )}

      <button
        onClick={addOrUpdateItem}
        className="px-3 py-1 bg-blue-500 text-white rounded"
      >
        {editingItem ? "Update Item" : "Add Item"}
      </button>

      <ul className="mt-2 text-sm space-y-1">
        {items.map((it) => (
          <li key={it.id} className="flex justify-between items-center">
            <span>
              {it.type.toUpperCase()}: {it.text}
              {it.type === "rubric" && it.observationId
                ? ` (obs: ${it.observationId})`
                : ""}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => startEdit(it)}
                className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs"
              >
                Edit
              </button>
              <button
                onClick={() => setModal({ open: true, id: it.id })}
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
          const idToRemove = modal.id;
          setModal({ open: false, id: null });
          removeItem(idToRemove);
        }}
        title="Confirm Delete"
        message="Remove this item? Linked tasks and sessions will be updated."
      />
    </Card>
  );
}