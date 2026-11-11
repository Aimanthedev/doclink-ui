// supabase.functions.invoke reports a non-2xx answer as an error whose `context` is
// the raw Response. Pull the function's own message out of its JSON body so users see
// "A staff member with that email already exists" instead of a generic failure.
export async function functionErrorMessage(error, fallback = 'Request failed') {
  try {
    const body = await error?.context?.json?.()
    if (body && typeof body.error === 'string' && body.error) return body.error
  } catch {
    // body was not JSON; fall through to the generic message
  }
  return error?.message || fallback
}
