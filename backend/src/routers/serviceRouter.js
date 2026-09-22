import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  uploadPhotos,
  createService,
  getMyServices,
  listServices,
  getServiceById,
  updateService,
  getServiceAvailability,
  updateAvailability,
  deleteService,
  createAppointment,
  listAppointments,
  getAppointmentById,
  acceptAppointment,
  declineAppointment,
  cancelAppointment,
  rescheduleAppointment,
  acceptReschedule,
  rejectReschedule,
  completeAppointment,
  markNoShow,
} from "../controllers/serviceController.js";

const serviceRouter = Router();
serviceRouter.use(authenticate);

serviceRouter.get("/services/mine", getMyServices);
serviceRouter.get("/services", listServices);
serviceRouter.post("/services/upload", uploadPhotos);
serviceRouter.post("/services", createService);
serviceRouter.get("/services/:id/availability", getServiceAvailability);
serviceRouter.put("/services/:id/availability", updateAvailability);
serviceRouter.get("/services/:id", getServiceById);
serviceRouter.patch("/services/:id", updateService);
serviceRouter.delete("/services/:id", deleteService);

serviceRouter.get("/appointments", listAppointments);
serviceRouter.post("/appointments", createAppointment);
serviceRouter.get("/appointments/:id", getAppointmentById);
serviceRouter.post("/appointments/:id/accept", acceptAppointment);
serviceRouter.post("/appointments/:id/decline", declineAppointment);
serviceRouter.post("/appointments/:id/cancel", cancelAppointment);
serviceRouter.post("/appointments/:id/reschedule", rescheduleAppointment);
serviceRouter.post("/appointments/:id/reschedule/accept", acceptReschedule);
serviceRouter.post("/appointments/:id/reschedule/reject", rejectReschedule);
serviceRouter.post("/appointments/:id/complete", completeAppointment);
serviceRouter.post("/appointments/:id/no-show", markNoShow);

export default serviceRouter;
