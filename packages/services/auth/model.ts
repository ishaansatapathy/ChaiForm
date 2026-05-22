import { z } from "zod";

export const authUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  profileImageUrl: z.string().nullable(),
  twoFactorEnabled: z.boolean(),
});

export const signInOutputSchema = z.union([
  z.object({
    twoFactorRequired: z.literal(true),
    email: z.string().email(),
    message: z.string(),
  }),
  z.object({
    twoFactorRequired: z.literal(false),
    user: authUserSchema,
  }),
]);

export const messageOutputSchema = z.object({
  message: z.string(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type SignInOutput = z.infer<typeof signInOutputSchema>;
export type MessageOutput = z.infer<typeof messageOutputSchema>;
