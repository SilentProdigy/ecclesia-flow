import { ImageResponse } from "next/og";

const allowedSizes = new Set([192, 512]);

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      size: string;
    }>;
  }
) {
  const { size } = await context.params;

  const dimension = Number(size);

  if (!allowedSizes.has(dimension)) {
    return new Response("Invalid icon size", {
      status: 404,
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#ffffff",
          fontSize: dimension * 0.25,
          fontWeight: 700,
          letterSpacing: "-0.05em",
        }}
      >
        CA
      </div>
    ),
    {
      width: dimension,
      height: dimension,
    }
  );
}