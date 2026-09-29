import { z } from "zod";

import { requiredText } from "./common";

/** The header profile panel: only the name fields are editable. */
const updateProfileSchema = z.object({
  firstName: requiredText("First name"),
  lastName: requiredText("Last name", 1),
});

type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

export type { UpdateProfileValues };
export { updateProfileSchema };
