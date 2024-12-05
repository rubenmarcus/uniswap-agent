"use client";

import dynamic from "next/dynamic";
import React from "react";
import "swagger-ui-react/swagger-ui.css";

// Suppress UNSAFE_ error from swagger-ui:
// https://github.com/swagger-api/swagger-ui/discussions/8592
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes("UNSAFE_")) return;
  if (args[0]?.includes("Warning: Received `true` for a non-boolean attribute"))
    return;
  if (args[0]?.includes("hydration")) return;
  originalError.call(console, ...args);
};

// Dynamically import Swagger UI with loading component and no SSR
const SwaggerUI = dynamic(
  () =>
    import("swagger-ui-react").then((mod) => mod.default) as Promise<
      React.ComponentType<{ url: string }>
    >,
  {
    ssr: false,
    loading: () => <div>Loading API documentation...</div>,
  },
);

export default function Home() {
  // Get the base URL on the client side
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";

  return (
    <div className="min-h-screen p-8">
      <SwaggerUI url={`${baseUrl}/.well-known/ai-plugin.json`} />
    </div>
  );
}
