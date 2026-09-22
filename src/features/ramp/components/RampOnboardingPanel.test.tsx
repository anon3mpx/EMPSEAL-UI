import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RampOnboardingPanel } from "./RampOnboardingPanel";

describe("RampOnboardingPanel", () => {
  it("presents both KYC and ToS URLs as handoffs", () => {
    render(
      <RampOnboardingPanel
        profile={null}
        kyc={{
          kycUrl: "https://kyc.example/start",
          tosUrl: "https://tos.example/accept",
          kycStatus: "INCOMPLETE",
          tosStatus: "PENDING",
        }}
        bankLink={null}
        accounts={[]}
        disabledReason={null}
        busy={false}
        onRegister={vi.fn()}
        onProfile={vi.fn()}
        onKyc={vi.fn()}
        onRefreshKyc={vi.fn()}
        onBankLink={vi.fn()}
        onExchange={vi.fn()}
        onSyncAccounts={vi.fn()}
      />,
    );
    expect(screen.getByText(/does not move funds/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "https://kyc.example/start" })).toHaveAttribute("href", "https://kyc.example/start");
    expect(screen.getByRole("link", { name: "https://tos.example/accept" })).toHaveAttribute("href", "https://tos.example/accept");
  });
});
