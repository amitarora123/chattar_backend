import { Request, Response } from "express";

const extractMeta = (html: string, property: string): string | null => {
  const ogMatch =
    html.match(
      new RegExp(
        `<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    ) ??
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`,
        "i",
      ),
    );
  if (ogMatch) return ogMatch[1];

  if (property === "title") {
    const nameMatch =
      html.match(
        /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      ) ?? html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (nameMatch) return nameMatch[1].trim();
  }
  if (property === "description") {
    const nameMatch =
      html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
      );
    if (nameMatch) return nameMatch[1];
  }
  return null;
};

export const getLinkPreview = async (req: Request, res: Response) => {
  const rawUrl = req.query.url as string;
  if (!rawUrl) return res.status(400).json({ error: "url is required" });

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return res.status(400).json({ error: "Only http/https URLs allowed" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const fetchRes = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ChatApp/1.0; +https://chattar-frontend-wusw.vercel.app)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    const contentType = fetchRes.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return res.status(422).json({ error: "Not an HTML page" });
    }

    // Read at most 50 kB so we don't buffer huge pages
    const reader = fetchRes.body?.getReader();
    if (!reader) return res.status(422).json({ error: "No body" });

    let html = "";
    let bytes = 0;
    const maxBytes = 50 * 1024;
    const decoder = new TextDecoder();

    while (bytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytes += value.byteLength;
    }
    reader.cancel().catch(() => {});

    const title = extractMeta(html, "title");
    const description = extractMeta(html, "description");
    const image = extractMeta(html, "image");

    return res.json({
      url: url.toString(),
      title: title ?? null,
      description: description ?? null,
      image: image ?? null,
    });
  } catch (err: unknown) {
    const message = (err as { message?: string }).message ?? "Failed to fetch";
    return res.status(502).json({ error: message });
  }
};
