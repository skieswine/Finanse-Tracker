import { ImageResponse } from "next/og";

// App icons generated at build time (no binary files in the repo):
//   /icons/192.png, /icons/512.png  — manifest "any"
//   /icons/maskable-512.png         — manifest "maskable" (glyph inside the safe zone)
//   /icons/apple-touch.png          — iOS home screen (180×180)
const ICONS = {
  "192.png": { size: 192, padding: 0.2, radius: 0.22 },
  "512.png": { size: 512, padding: 0.2, radius: 0.22 },
  "maskable-512.png": { size: 512, padding: 0.3, radius: 0 },
  "apple-touch.png": { size: 180, padding: 0.2, radius: 0 },
} as const;

type IconFile = keyof typeof ICONS;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[file]">) {
  const { file } = await params;
  if (!(file in ICONS)) return new Response("Not found", { status: 404 });
  const { size, padding, radius } = ICONS[file as IconFile];
  const glyph = Math.round(size * (1 - padding * 2));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
          borderRadius: radius * size,
        }}
      >
        {/* lucide "wallet" */}
        <svg
          width={glyph}
          height={glyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
          <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
