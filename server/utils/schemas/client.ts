import { z } from "zod";

const optionalTrimmed = () =>
  z
    .union([z.string(), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }
      return undefined;
    });

export const clientPayloadSchema = z.object({
  fullName: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Client name is required")),
  businessName: optionalTrimmed(),
  email: optionalTrimmed().refine(
    (value) => !value || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
    { message: "Enter a valid email" },
  ),
  phone: optionalTrimmed().refine(
    (value) => !value || value.length >= 3,
    { message: "Enter a valid phone number" },
  ),
  whatsappNumber: optionalTrimmed().refine(
    (value) => !value || value.length >= 3,
    { message: "Enter a valid WhatsApp number" },
  ),
  momoProvider: z.enum(["mtn", "vodafone", "airteltigo", "other"]).default("mtn"),
  notes: optionalTrimmed().refine(
    (value) => !value || value.length <= 1000,
    { message: "Notes must be 1000 characters or less" },
  ),
});

export type ClientPayload = z.output<typeof clientPayloadSchema>;
