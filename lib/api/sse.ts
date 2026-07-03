/**
 * Minimal Server-Sent Events helpers for streaming chat responses.
 *
 * The chat route pre-flights auth + quota (returning a normal JSON envelope on
 * failure), then streams the assistant reply as SSE: incremental `delta` events
 * followed by a terminal `done` event that carries the `warning_trigger`
 * (LIMIT_80 / LIMIT_100) and usage metadata — mirroring the response.ts shape.
 */

export type SseChunk = {
  event: string;
  data: unknown;
};

export function encodeSseChunk(chunk: SseChunk): string {
  return `event: ${chunk.event}\ndata: ${JSON.stringify(chunk.data)}\n\n`;
}

export function createSseResponse(
  generator: AsyncGenerator<SseChunk>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(encoder.encode(encodeSseChunk(chunk)));
        }
      } catch {
        controller.enqueue(
          encoder.encode(
            encodeSseChunk({
              event: "error",
              data: { message: "Akış sırasında bir hata oluştu." },
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
