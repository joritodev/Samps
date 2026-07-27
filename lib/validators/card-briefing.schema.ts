import { z } from "zod";

export const cardBriefingSchema = z
  .object({
    title: z.string().min(1, "Título obrigatório"),
    description: z.string().min(1, "Descrição obrigatória"),
    format: z.string().min(1, "Formato obrigatório"),
    objective: z.string().optional(),
    priorityId: z.string().optional(),
    sectorId: z.string().optional(),
    publishDate: z.coerce.date().optional(),
    complexityLevel: z.coerce.number().optional(),
    slidesCount: z.coerce.number().optional(),
    screensCount: z.coerce.number().optional(),
    durationSeconds: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    const fmt = (data.format ?? "").toLowerCase();
    if (fmt.includes("carrossel") && !data.slidesCount) {
      ctx.addIssue({ code: "custom", message: "Número de slides obrigatório", path: ["slidesCount"] });
    }
    if (fmt.includes("stor") && !data.screensCount) {
      ctx.addIssue({ code: "custom", message: "Número de telas obrigatório", path: ["screensCount"] });
    }
    if ((fmt.includes("reel") || fmt.includes("vídeo") || fmt.includes("video")) && !data.durationSeconds) {
      ctx.addIssue({ code: "custom", message: "Duração obrigatória", path: ["durationSeconds"] });
    }
  });

export type CardBriefingInput = z.infer<typeof cardBriefingSchema>;
