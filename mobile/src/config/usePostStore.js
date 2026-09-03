import React, { createContext, useContext, useState } from "react";

const PostContext = createContext(null);

const INITIAL = {
  title: "",
  category: null,
  description: "",
  location: "",
  budgetAmount: "",
  paymentType: "fixed",
  dateNeeded: "",
  timeNeeded: "",
  isUrgent: false,
  duration: null,
  skills: [],          // string[] of requirements
  photos: [],
  doerCount: 1,
};

export function PostProvider({ children }) {
  const [data, setData] = useState(INITIAL);

  const update = (partial) =>
    setData((prev) => ({ ...prev, ...partial }));

  const reset = () => setData(INITIAL);

  return (
    <PostContext.Provider value={{ data, update, reset }}>
      {children}
    </PostContext.Provider>
  );
}

export function usePost() {
  const ctx = useContext(PostContext);
  if (!ctx) {
    throw new Error("usePost must be used inside <PostProvider>");
  }
  return ctx;
}
