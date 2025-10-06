import React, { useState } from "react";
import toast from "react-hot-toast";

import QuestionList from "./QuestionList";
import QuestionEditor from "./QuestionEditor";

export default function QuestionBank() {
  const [editing, setEditing] = useState(null);
  // const notify = (msg) => alert(msg);
  const notify = (msg, type = "info") => {
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else toast(msg);
  };

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
