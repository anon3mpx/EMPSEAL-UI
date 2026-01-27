import { useRef, useEffect } from "react";

export default function TermsModal({ onClose }) {
  const cardRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);
  return (
    <div
      ref={cardRef}
      className="relative bg-black text-white md:p-8 p-4 rounded-2xl flex flex-col items-center gap-4 md:max-w-[700px] w-full"
    >
      <svg
        onClick={onClose}
        className="absolute cursor-pointer md:right-10 right-4 md:top-12 top-4 tilt"
        width={18}
        height={19}
        viewBox="0 0 18 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M17 1.44824L1 17.6321M1 1.44824L17 17.6321"
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h2 className="md:text-2xl text-xl font-bold text-white mb-2 text-center font-orbitron">
        Terms and Conditions
      </h2>
      <div className="h-[180px] overflow-y-auto md:pl-10 pl-4 text-white roboto font-bold text-[10px] terms mr-3 pr-4">
        EMPX – Terms & Conditions
        <br />
        These Terms & Conditions (“Terms”) govern your access to and use of the
        EMPX decentralized application (“EMPX”, “we”, “us”, or “our”), operated
        by EMPX DAO (the “DAO”).
        <br />
        By connecting a compatible blockchain wallet or otherwise interacting
        with EMPX, you agree to be bound by these Terms.
        <br />
        1. No Legal, Financial, Tax, or Investment Advice EMPX is a
        decentralized protocol enabling users to access blockchain services.
        Nothing on EMPX constitutes professional financial, legal, investment,
        tax, or other advice of any kind.Users are solely responsible for their
        own research, decisions, and actions.
        <br />
        2. Acceptance of Risks You acknowledge and agree that: Using
        decentralized finance (“DeFi”) protocols involves risks (smart contract
        failures, hacks, economic exploits, blockchain congestion, bugs, etc.).
        You may lose value and funds due to user error, blockchain events, or
        third-party vulnerabilities. EMPX is provided “as is” and “as available”
        without warranty of any kind. Audits for products are available.
        <br />
        3. No Liability Under no circumstances will EMPX, EMPX DAO, its
        founders, contributors, members, partners, agents, successors, or
        assigns be liable for:
        <br />
        Direct, indirect, incidental, special, punitive, or consequential
        losses.
        <br />
        Loss of funds, tokens, or other digital assets.
        <br />
        Claims relating to taxes, regulations, or legal compliance.
        <br />
        This includes liabilities arising from:
        <br />
        Smart contract vulnerabilities
        <br />
        Bridge exploits or cross-chain failures Aggregated protocol failures
        Network congestion Third-party service risks
        <br />
        4. User Responsibility You alone are responsible for:
        <br />
        Performing due diligence on all transactions you submit.
        <br />
        Understanding all smart contracts and DeFi mechanisms you interact with.
        <br />
        Safeguarding your wallet keys, seed phrases, passwords, and private
        information.
        <br />
        EMPX does not have access to your wallet keys and cannot help recover
        lost funds.
        <br />
        5.️ No Warranty EMPX and EMPX DAO expressly disclaim all warranties,
        whether express, implied, statutory, or otherwise, including but not
        limited to:
        <br />
        Security of smart contracts Availability or uptime of services
        Compatibility with future protocols, bridges, or chains Accuracy of
        aggregated pricing or routing
        <br />
        6. Third-Party Integrations EMPX may integrate with external protocols
        (liquidity sources, bridges, oracles, etc.). These integrations: Are not
        owned or controlled by EMPX. Operate at your own risk. May change
        without notice. EMPX is not responsible for the performance, security,
        or data practices of third-party services.
        <br />
        7. User Conduct You agree not to: Use EMPX for illegal or harmful
        activities. Attempt to reverse-engineer or exploit the protocol. Disrupt
        normal usage of EMPX, its smart contracts, or community channels.
        Violations may result in public disclosure of wallet addresses or
        community enforcement actions but do not create liability for EMPX.
        <br />
        8. No Jurisdictional Guarantees EMPX is accessible globally. You agree
        that: You are responsible for compliance with local laws and regulations
        in your jurisdiction. EMPX does not guarantee services in any specific
        country. Use in sanctioned or restricted jurisdictions is strictly your
        responsibility. No part of these Terms is intended to create a contract
        governed by localized consumer protection laws that cannot be waived.
        <br />
        9. Updates to Terms EMPX may update these Terms at any time. Continued
        use of the protocol constitutes acceptance of updated terms.
        <br />
        10.️ Governing Law & Dispute Resolution These Terms are governed by:
        Stateless blockchain principle Non-exclusive jurisdiction principles To
        the maximum extent permitted, disputes will be resolved under the laws
        you select in the DAO’s governance model or via arbitration rather than
        civil courts.
        <br />
        11.️ DAO Governance EMPX DAO may modify, fork, or discontinue EMPX
        features through on-chain governance voting. Participation in governance
        does not make you an agent or legal representative of EMPX DAO.
        <br />
        12. Waiver & Severability If any provision is found unenforceable, the
        remaining Terms remain in effect.
      </div>
    </div>
  );
}
