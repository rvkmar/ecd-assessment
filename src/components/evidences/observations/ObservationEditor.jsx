import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

/**
 * ObservationEditor
 * Props:
 * - observations
 * - setObservations
 * - constructs (for linking)
 * - rubrics (for rubric-type scoring)
 */
export default function ObservationEditor({ observations, setObservations, constructs, rubrics }) {
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/questions")
      .then((res) => res.json())
      .then((data) => setQuestions(data || []))
      .catch(() => setQuestions([]));
  }, []);

  const addObservation = () => {
    setObservations([
      ...observations,
      {
        id: `o${Date.now()}`,
        text: "",
        constructId: "",
        type: "selected_response",
        linkedQuestionIds: [],
        rubric: null,
        scoring: { method: "binary", weights: {} },
      },
    ]);
  };

  const updateObservation = (id, updates) => {
    setObservations(
      observations.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const removeObservation = (id) => {
    setObservations(observations.filter((o) => o.id !== id));
  };

  const handleQuestionToggle = (obs, qid) => {
    const isSelected = obs.linkedQuestionIds.includes(qid);
    const newIds = isSelected
      ? obs.linkedQuestionIds.filter((id) => id !== qid)
      : [...obs.linkedQuestionIds, qid];
    updateObservation(obs.id, { linkedQuestionIds: newIds });
  };

  const renderScoringEditor = (obs) => {
    const scoring = obs.scoring || { method: "binary", weights: {} };

    const setScoring = (updates) => {
      updateObservation(obs.id, { scoring: { ...scoring, ...updates } });
    };

    return (
      <div className="mt-2 p-2 border rounded bg-gray-50 space-y-2">
        <label className="block text-sm font-medium">Scoring Method</label>
        <Select
          value={scoring.method}
          onValueChange={(val) => setScoring({ method: val })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="binary">Binary</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="rubric">Rubric</SelectItem>
          </SelectContent>
        </Select>

        {/* Binary */}
        {scoring.method === "binary" && (
          <div className="text-sm text-gray-600">
            <p>Correct → 1, Incorrect → 0 (default)</p>
          </div>
        )}

        {/* Partial scoring: assign weights per linked question option */}
        {scoring.method === "partial" && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Partial Weights (by option)</h4>
            {questions
              .filter((q) => obs.linkedQuestionIds.includes(q.id))
              .map((q) => (
                <div key={q.id} className="ml-2">
                  <p className="text-sm font-semibold">{q.stem}</p>
                  {(q.options || []).map((opt) => (
                    <div key={opt.id} className="flex items-center space-x-2">
                      <label className="flex-1 text-sm">{opt.text}</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={scoring.weights?.[opt.id] ?? 0}
                        onChange={(e) =>
                          setScoring({
                            weights: {
                              ...scoring.weights,
                              [opt.id]: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-20"
                      />
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}

        {/* Rubric scoring: assign weights to rubric levels */}
        {scoring.method === "rubric" && obs.type === "rubric" && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Rubric Weights</h4>
            {rubrics
              .filter((r) => r.observationId === obs.id)
              .flatMap((r) =>
                (r.criteria || []).flatMap((c) =>
                  (c.levels || []).map((l) => (
                    <div key={`${r.id}-${c.id}-${l.name}`} className="flex items-center space-x-2">
                      <label className="flex-1 text-sm">{l.name}</label>
                      <Input
                        type="number"
                        step="1"
                        value={scoring.weights?.[l.name] ?? 0}
                        onChange={(e) =>
                          setScoring({
                            weights: {
                              ...scoring.weights,
                              [l.name]: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-20"
                      />
                    </div>
                  ))
                )
              )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 border rounded-md space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Observations</h3>
        <button
          type="button"
          onClick={addObservation}
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          + Add Observation
        </button>
      </div>

      {observations.length === 0 && (
        <p className="text-gray-500 text-sm">No observations defined yet.</p>
      )}

      <ul className="space-y-3">
        {observations.map((o) => (
          <li
            key={o.id}
            className="p-3 border rounded bg-gray-50 space-y-2 shadow-sm"
          >
            {/* ID */}
            <div>
              <label className="block text-sm font-medium">Observation ID</label>
              <input
                type="text"
                value={o.id}
                readOnly
                className="w-full border rounded p-2 bg-gray-100 text-sm"
              />
            </div>

            {/* Text */}
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                rows={2}
                value={o.text}
                onChange={(e) => updateObservation(o.id, { text: e.target.value })}
                className="w-full border rounded p-2 text-sm"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium">Type of Observation</label>
              <select
                value={o.type}
                onChange={(e) => updateObservation(o.id, { type: e.target.value })}
                className="w-full border rounded p-2 text-sm"
              >
                <option value="selected_response">Selected Response</option>
                <option value="open_response">Open Response</option>
                <option value="rubric">Rubric</option>
                <option value="numeric">Numeric</option>
                <option value="performance">Performance</option>
                <option value="artifact">Artifact</option>
                <option value="behavior">Behavior</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Linked construct */}
            <div>
              <label className="block text-sm font-medium">Linked Construct</label>
              <select
                value={o.constructId}
                onChange={(e) => updateObservation(o.id, { constructId: e.target.value })}
                className="w-full border rounded p-2 text-sm"
              >
                <option value="">Select construct</option>
                {constructs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.text || c.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Linked questions */}
            <div>
              <label className="block text-sm font-medium">Linked Questions</label>
              <Input
                type="text"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1 bg-white">
                {questions
                  .filter((q) =>
                    q.stem.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((q) => (
                    <div key={q.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`chk-${o.id}-${q.id}`}
                        checked={o.linkedQuestionIds.includes(q.id)}
                        onCheckedChange={() => handleQuestionToggle(o, q.id)}
                      />
                      <label htmlFor={`chk-${o.id}-${q.id}`} className="text-sm">
                        {q.stem}
                      </label>
                    </div>
                  ))}
              </div>
            </div>

            {/* Scoring */}
            {renderScoringEditor(o)}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeObservation(o.id)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                ✕ Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
