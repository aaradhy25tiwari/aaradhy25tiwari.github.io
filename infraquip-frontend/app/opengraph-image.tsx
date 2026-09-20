import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "InfraQuip — Construction Equipment Rental & Sales Marketplace";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          backgroundColor: "#090d16",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "14px",
                backgroundColor: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: "bold",
                color: "#0f172a",
              }}
            >
              IQ
            </div>
            <span style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-1px" }}>
              Infra<span style={{ color: "#f59e0b" }}>Quip</span>
            </span>
          </div>
          <div
            style={{
              padding: "10px 22px",
              borderRadius: "999px",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              color: "#fbbf24",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            India's B2B Equipment Marketplace
          </div>
        </div>

        {/* Main Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "950px" }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: "900",
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            Find, Rent & Buy Heavy Construction Machinery Near You
          </h1>
          <p style={{ fontSize: "24px", color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>
            Verified Excavators, Cranes, Bulldozers, Forklifts & Loaders across 50+ Indian cities.
          </p>
        </div>

        {/* Bottom Bar Features */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "40px",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#e2e8f0", fontSize: "18px" }}>
            <span style={{ color: "#22c55e", fontSize: "22px" }}>✓</span> Verified Vendors & Machines
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#e2e8f0", fontSize: "18px" }}>
            <span style={{ color: "#22c55e", fontSize: "22px" }}>✓</span> Transparent Pricing
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#e2e8f0", fontSize: "18px" }}>
            <span style={{ color: "#22c55e", fontSize: "22px" }}>✓</span> Instant Direct Enquiries
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
