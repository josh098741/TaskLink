import { Router } from "express";
import express from "express";
import { handleClerkWebhook } from "../controllers/webhookController.js";

const webhookRouter = Router();

webhookRouter.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    handleClerkWebhook
);

export default webhookRouter;
