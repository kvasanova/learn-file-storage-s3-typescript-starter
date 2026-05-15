import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  console.log("uploading thumbnail for video", videoId, "by user", userID);

  const formData = await req.formData();
  const file = formData.get("thumbnail");
  if (!(file instanceof File)) {
    throw new BadRequestError("Thumbnail is not a file");
  }

  const type = file.type;
  const data = await file.arrayBuffer();
  const video = getVideo(cfg.db, videoId)
  if ( video?.userID !== userID){
    throw new UserForbiddenError("You are not authorized to upload a thumbnail for this video");
  }

  const base64 = Buffer.from(data).toString("base64");
  const thumbnailURL = `data:${type};base64,${base64}`;
  const updatedVideo = { ...video, thumbnailURL: thumbnailURL };
  updateVideo(cfg.db, updatedVideo);
  return respondWithJSON(200, updatedVideo);
}
