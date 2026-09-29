type FieldErrors = Record<string, string[] | undefined>;

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

function actionOk(): ActionResult;
function actionOk<T>(data: T): ActionResult<T>;
function actionOk<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

function actionError(
  error: string,
  fieldErrors?: FieldErrors,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export type { ActionResult, FieldErrors };
export { actionOk, actionError };
