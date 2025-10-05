import React, { useState } from "react";
import QuestionList from "./QuestionList";
import QuestionEditor from "./QuestionEditor";

export default function QuestionBank() {
  const [editing, setEditing] = useState(null);
  const notify = (msg) => alert(msg);

  return (
    <div>
      {!editing && (
        <QuestionList
          onEdit={(q) => setEditing(q)}
          notify={notify}
        />
      )}
      {editing && (
        <QuestionEditor
          notify={notify}
          question={editing}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
