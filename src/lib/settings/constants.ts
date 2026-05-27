import { z } from "zod";

export const bucketModeSchema = z.enum(["relative", "named_days"]);
export type BucketMode = z.infer<typeof bucketModeSchema>;

export const DEFAULT_BUCKET_MODE: BucketMode = "relative";
