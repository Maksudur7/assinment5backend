import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { deleteWatchlistController, getWatchlistController, toggleWatchlistController, getHistoryController, addToHistoryController } from "./watchlist.controller";

const watchlistRouter = Router();

watchlistRouter.get("/", authenticate, asyncHandler(getWatchlistController));
watchlistRouter.post("/:mediaId", authenticate, asyncHandler(toggleWatchlistController));
watchlistRouter.delete("/:mediaId", authenticate, asyncHandler(deleteWatchlistController));

watchlistRouter.get("/history", authenticate, asyncHandler(getHistoryController));
watchlistRouter.post("/history/:mediaId", authenticate, asyncHandler(addToHistoryController));

export default watchlistRouter;
