// src/components/taskModels/TaskModelDetails.jsx
import React, { useEffect, useState } from "react";
import Card from "../ui/Card";
import Modal from "../ui/Modal";

export default function TaskModelDetails({ taskModel, onClose }) {
  const [evidenceModels, setEvidenceModels] = useState([]);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    fetch("/api/evidenceModels")
      .then((r) => r.json())
      .then((data) => setEvidenceModels(data || []))
      .catch(() => setEvidenceModels([]));

    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => setQuestions(data || []))
      .catch(() => setQuestions([]));
  }, []);

  if (!taskModel) return null;

  const getEvidenceModel = (id) =>
    evidenceModels.find((m) => m.id === id);

  const getEvidenceDescription = (id) => {
    for (const em of evidenceModels) {
      const ev = (em.evidences || []).find((e) => e.id === id);
      if (ev) return ev.description || ev.id;
    }
    return id;
  };

  const getObservationDescription = (id) => {
    for (const em of evidenceModels) {
      const obs = (em.observations || []).find((o) => o.id === id);
      if (obs) return obs.description || obs.id;
    }
    return id;
  };

  const getQuestionText = (id) => {
    const q = questions.find((qq) => qq.id === id);
    return q ? (q.stem || q.text || q.id) : id;
  };


  // 🔹 Recursive renderer for sub-tasks (expanded from backend)
  const renderSubTasks = (subs, level = 0) => {
    if (!subs || subs.length === 0) return null;
    return (
      <ul className="list-disc ml-5">
        {subs.map((sub) => (
          <li key={sub.id}>
            <span className="font-medium">{sub.name || sub.id}</span>{" "}
            <span className="text-gray-500">({sub.id})</span>
            {sub.description && (
              <div className="text-sm text-gray-600 ml-2">
                {sub.description}
              </div>
            )}
            {sub.subTasks?.length > 0 && renderSubTasks(sub.subTasks, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Modal
      isOpen={!!taskModel}
      onClose={onClose}
      title={`Activity Template: ${taskModel.name}`}
      message=""
    >
      <Card>
        {/* Metadata */}
        <p>
          <strong>Description:</strong> {taskModel.description || "-"}
        </p>
        <p>
          <strong>Difficulty:</strong> {taskModel.difficulty || "-"}
        </p>
        <p>
          <strong>Actions:</strong>{" "}
          {taskModel.actions?.length ? taskModel.actions.join(", ") : "-"}
        </p>

        {/* ✅ Created & Last updated */}
        <div className="text-xs text-gray-400 mt-2 space-y-1">
          {taskModel.createdAt && (
            <p>Created: {new Date(taskModel.createdAt).toLocaleString()}</p>
          )}
          {taskModel.updatedAt && (
            <p>Last updated: {new Date(taskModel.updatedAt).toLocaleString()}</p>
          )}
        </div>

        {/* Linked Evidence Models */}
        <h4 className="mt-3 font-semibold">Linked Evidence Rules</h4>
        {taskModel.evidenceModelIds?.length > 0 ? (
          <ul className="list-disc ml-5">
            {taskModel.evidenceModelIds.map((emId) => {
              const em = getEvidenceModel(emId);
              return (
                <li key={emId}>
                  {em?.name || emId}{" "}
                  <span className="text-gray-500">({emId})</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">None</p>
        )}

        {/* Expected Observations */}
        <h4 className="mt-3 font-semibold">Expected Indicators</h4>
        {taskModel.expectedObservations?.length > 0 ? (
          <ul className="list-disc ml-5">
            {taskModel.expectedObservations.map((eo, i) => (
              <li key={i}>
                Ind:{" "}
                <span className="italic">
                  {getObservationDescription(eo.observationId)}
                </span>{" "}
                <span className="text-gray-500">
                  ({eo.observationId})
                </span>
                , Ev:{" "}
                <span className="italic">
                  {getEvidenceDescription(eo.evidenceId)}
                </span>{" "}
                <span className="text-gray-500">
                  ({eo.evidenceId})
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">None defined</p>
        )}

        {/* Item Mappings */}
        <h4 className="mt-3 font-semibold">Item Mappings</h4>
        {taskModel.itemMappings?.length > 0 ? (
          <ul className="list-disc ml-5">
            {taskModel.itemMappings.map((m, i) => (
              <li key={i}>
                Indicator: <code>{m.observationId}</code>, Ev:{" "}
                <code>{m.evidenceId}</code> ↳ Item:{" "}
                <span className="italic">{getQuestionText(m.itemId)}</span>{" "}
                <span className="text-gray-500">({m.itemId})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No items mapped</p>
        )}

        {/* Sub-Tasks */}
        <h4 className="mt-3 font-semibold">Sub-Tasks</h4>
        {taskModel.expandedSubTasks?.length > 0 ? (
          renderSubTasks(taskModel.expandedSubTasks)
        ) : (
          <p className="text-sm text-gray-500">None</p>
        )}
      </Card>
    </Modal>
  );
}
