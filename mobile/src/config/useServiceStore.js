import React, { createContext, useContext, useState } from "react";

const ServiceContext = createContext(null);

const INITIAL = {
  title: "",
  category: null,
  description: "",
  location: "",
  serviceMode: "on_site",
  priceType: "fixed",
  currency: "KES",
  priceAmount: "",
  durationMinutes: "",
  bufferMinutes: "0",
  bookingEnabled: true,
  bookingMode: "request",
  minNoticeMinutes: "60",
  maxAdvanceBookingDays: "90",
  maxConcurrentBookings: "1",
  status: "draft",
  skills: [],
  photos: [],
  availability: [],
};

export function ServiceProvider({ children }) {
  const [data, setData] = useState(INITIAL);

  const update = (partial) =>
    setData((previous) => ({ ...previous, ...partial }));

  const reset = () => setData({ ...INITIAL });

  return (
    <ServiceContext.Provider value={{ data, update, reset }}>
      {children}
    </ServiceContext.Provider>
  );
}

export function useService() {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error("useService must be used inside <ServiceProvider>");
  }
  return context;
}
