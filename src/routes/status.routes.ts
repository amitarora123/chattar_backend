import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate.middleware";
import {
  getFeed,
  getMyStatuses,
  getArchivedStatuses,
  getStatusViewers,
  createStatus,
  deleteStatus,
  viewStatus,
  reactToStatus,
  commentOnStatus,
  deleteComment,
  archiveStatus,
  repostStatus,
  voteOnPoll,
} from "@/controllers/StatusController";
import {
  createStatusSchema,
  reactToStatusSchema,
  commentOnStatusSchema,
  deleteCommentSchema,
  voteOnPollSchema,
} from "@/validators/status.validators";

const StatusRoutes = Router();

StatusRoutes.use(authMiddleware);

StatusRoutes.get("/feed", getFeed);
StatusRoutes.get("/me", getMyStatuses);
StatusRoutes.get("/archive", getArchivedStatuses);
StatusRoutes.get("/:status_id/viewers", getStatusViewers);

StatusRoutes.post("/", validate(createStatusSchema), createStatus);
StatusRoutes.delete("/:status_id", deleteStatus);
StatusRoutes.post("/:status_id/view", viewStatus);
StatusRoutes.post(
  "/:status_id/react",
  validate(reactToStatusSchema),
  reactToStatus,
);
StatusRoutes.post(
  "/:status_id/comment",
  validate(commentOnStatusSchema),
  commentOnStatus,
);
StatusRoutes.delete(
  "/:status_id/comment/:comment_id",
  validate(deleteCommentSchema),
  deleteComment,
);
StatusRoutes.post("/:status_id/archive", archiveStatus);
StatusRoutes.post("/:status_id/repost", repostStatus);
StatusRoutes.post(
  "/:status_id/poll/vote",
  validate(voteOnPollSchema),
  voteOnPoll,
);

export default StatusRoutes;
