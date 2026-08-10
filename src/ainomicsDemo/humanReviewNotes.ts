/** Manual review notes — written without AI tools. */
export function formatReviewNote(author: string, body: string): string {
  return `${author.trim()}: ${body.trim()}`;
}
