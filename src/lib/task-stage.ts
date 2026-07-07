export const TASK_STAGE_ORDER = ["Post-call", "POV", "Value Engineering", "Manual", "Other"]

export function stageFromSource(source: string): string {
  if (source.startsWith("post_call_")) return "Post-call"
  if (source.startsWith("pov_")) return "POV"
  if (source.startsWith("ve_")) return "Value Engineering"
  if (source === "manual") return "Manual"
  return "Other"
}
