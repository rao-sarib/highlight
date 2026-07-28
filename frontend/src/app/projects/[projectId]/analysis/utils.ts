/** Display helpers for analysis data. */

/** "missing_meta_description" -> "Missing Meta Description" */
export function humanIssue(issueType: string): string {
  return issueType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
