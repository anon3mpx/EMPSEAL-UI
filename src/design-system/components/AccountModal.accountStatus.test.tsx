import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AccountModal from "./AccountModal";

const address = "0x1111111111111111111111111111111111111111";

describe("AccountModal portfolio state", () => {
  it("shows loading instead of zero counts or an empty wallet while scanning", () => {
    render(<AccountModal open onClose={() => {}} address={address} portfolioStatus="loading" activityAvailable={false} nativeBalance="—" nativeTicker="ETH" />);
    expect(screen.getByText("Loading balances…")).toBeInTheDocument();
    expect(screen.queryByText("No token balances detected on connected wallet")).not.toBeInTheDocument();
    expect(screen.getByText("Activity unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/— ETH/)).not.toBeInTheDocument();
  });

  it("shows a scan failure separately from an empty wallet", () => {
    render(<AccountModal open onClose={() => {}} address={address} portfolioStatus="error" activityAvailable={false} />);
    expect(screen.getByText("Balances unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No network balances detected")).not.toBeInTheDocument();
  });

  it("does not show unavailable quick actions", () => {
    render(<AccountModal open onClose={() => {}} address={address} portfolioStatus="ready" activityAvailable={false} />);
    expect(screen.queryByRole("button", { name: "Receive" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bridge" })).not.toBeInTheDocument();
  });
});
