/** Bound each inference so playback can start after the first sentence. */
export function speechChunks(text: string): string[] {
  const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const sentences = clean.match(/[^。！？!?]+[。！？!?]*/gu) ?? [];
  return sentences.flatMap(sentence => {
    const characters = Array.from(sentence);
    const chunks: string[] = [];
    for (let i = 0; i < characters.length; i += 100) chunks.push(characters.slice(i, i + 100).join(''));
    return chunks;
  }).filter(chunk => chunk.trim().length > 0);
}
