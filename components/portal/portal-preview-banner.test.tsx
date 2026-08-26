// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PortalPreviewBanner } from "./portal-preview-banner";

afterEach(() => {
  cleanup();
});

describe("PortalPreviewBanner", () => {
  it("renders children as a status notice", () => {
    render(
      <PortalPreviewBanner>
        Você está visualizando o portal como cliente.
      </PortalPreviewBanner>
    );

    const banner = screen.getByRole("status");
    expect(banner.textContent).toMatch(/visualizando o portal/);
  });

  it("uses warning tokens instead of amber", () => {
    render(<PortalPreviewBanner>Preview</PortalPreviewBanner>);

    const banner = screen.getByRole("status");
    expect(banner.className).toMatch(/border-warning\/30/);
    expect(banner.className).toMatch(/bg-warning\/10/);
    expect(banner.className).toMatch(/text-sm/);
    expect(banner.className).toMatch(/text-foreground/);
    expect(banner.className).not.toMatch(/amber/);
  });
});
