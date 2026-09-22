// ─── LandingV4 — the v4 landing, React shell + vendored visual engine ─────
//
// Hybrid port of public/landing-v4.html (owner decision 2026-08-19).
//
// The shell below is the page's real markup as JSX, so copy, section order and
// structure are editable here like any component. The generative visuals stay
// in ./landingV4Engine, byte-identical to the signed-off design — that file
// builds 1,262 elements, 7 canvases and 17 SVGs with its own layout math, and
// reimplementing it declaratively would risk drift for no benefit.
//
// The engine owns this subtree once mounted: it mutates these nodes directly
// and React must never re-render over it. That is safe precisely because this
// component holds NO state — if you add any, hoist it above LandingV4 or give
// the shell a stable `key`, or the engine's work will be wiped on re-render.
//
// StrictMode note: the app mounts under React.StrictMode (src/main.jsx), so
// effects run twice in development. The engine appends DOM rather than
// replacing it, which would duplicate every generated element on the second
// pass, so teardown restores the pristine shell markup captured before the
// first mount.

import { useEffect, useRef } from "react";
import { mountLandingV4 } from "./landingV4Engine";
import "./landing-v4.css";


// ─── SEO ──────────────────────────────────────────────────────────────────
// The static page carried its own <title>, description, OG/Twitter cards and
// SoftwareApplication JSON-LD. On a client route none of that applies, which
// would silently downgrade the most SEO-sensitive page in the product, so the
// component installs the tags on mount and restores the app's originals on
// unmount.
//
// NOTE: the copy below says "twelve bridge rails" because that is what the
// signed-off landing says. The real number is disputed (UI registry RAILS[] =
// 13, SDK RailVariantLabel = 15, vault says 12 and is stale) and the owner has
// not picked one. Change it HERE and in the JSON-LD together, once decided.
const SEO = {
  title: "EmpX — Cross-chain swap aggregator & settlement layer",
  description:
    "EmpX routes swaps across 100+ DEXes and reaches 180+ chains through twelve bridge rails — one router, one integration.",
  image: "https://empx.io/emp-main-logo.png",
  url: "https://empx.io/",
};

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  let created = false;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
    created = true;
  }
  const prev = el.getAttribute("content");
  el.setAttribute("content", content);
  return () => {
    if (created) el!.remove();
    else if (prev !== null) el!.setAttribute("content", prev);
  };
}

function useLandingSeo() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = SEO.title;

    const restores = [
      setMeta('meta[name="description"]', "name", "description", SEO.description),
      setMeta('meta[property="og:type"]', "property", "og:type", "website"),
      setMeta('meta[property="og:title"]', "property", "og:title", SEO.title),
      setMeta('meta[property="og:description"]', "property", "og:description", SEO.description),
      setMeta('meta[property="og:image"]', "property", "og:image", SEO.image),
      setMeta('meta[property="og:url"]', "property", "og:url", SEO.url),
      setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image"),
      setMeta('meta[name="twitter:title"]', "name", "twitter:title", SEO.title),
      setMeta('meta[name="twitter:description"]', "name", "twitter:description", SEO.description),
      setMeta('meta[name="twitter:image"]', "name", "twitter:image", SEO.image),
    ];

    // index.html already ships a site-wide WebApplication block named
    // "EMPX DeFi Platform". Leaving both in place gives crawlers two records
    // for one product under different @type AND different name, so the app's
    // block is parked (not removed) for as long as the landing is mounted.
    const siteLd = document.head.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    if (siteLd) siteLd.type = "application/ld+json-parked";

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "EmpX",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: SEO.url,
      description: SEO.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      restores.forEach((r) => r());
      ld.remove();
      if (siteLd) siteLd.type = "application/ld+json";
    };
  }, []);
}

export default function LandingV4() {
  useLandingSeo();

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const pristine = root.innerHTML;
    const teardown = mountLandingV4();

    return () => {
      teardown();
      // Restore the shell so a remount (StrictMode, or route re-entry) starts
      // from the same markup the engine expects rather than its own output.
      root.innerHTML = pristine;
    };
  }, []);

  return (
    <div className="empx-landing-v4" ref={rootRef}>
        <div className="sw" id="sw">
          <div className="stg" id="stg">
            <canvas className="bg"></canvas>
            <div className="brandTop" id="brandTop"><img id="bimg" alt="EmpX" /><span>EmpX</span></div>
            <div className="cmd" id="cmd">
              <div className="cur" id="cmdCur"><span className="ixn" id="cmdIx">01</span><span className="nmn" id="cmdNm">The settlement layer</span><span className="chev"></span></div>
              <div className="lks">
                <a href="#" data-go="1">Swap</a><a href="#" data-go="4">Layers</a><a href="#" data-go="2">Chains</a>
                <a href="#" data-go="5">Build</a><a href="#" data-go="8">Why</a><a href="#" className="cta" data-go="8">Launch app</a>
              </div>
            </div>
            <div className="ly s1" id="L1">
              <div className="ct">
                <h1>The settlement layer<br />for <b>every chain.</b></h1>
                <p className="bo">On-chain, permissionless aggregation with native settlement across 15+ chains and 100+ DEXes — and cross-chain reach to over 180. One router, one signature.</p>
                <div className="row"><span className="btnA">Launch app</span><span className="btnB" data-open="Integration">Integrate EmpX</span></div>
                <div className="tls">
                  <div className="tl"><div className="tp"><div className="dg"><i className="on"></i><i></i><i className="on"></i><i></i><i className="on"></i><i></i><i className="on"></i><i className="on"></i><i></i></div><span className="bdg">Live</span></div>
                    <div className="v">180+</div><div className="l">Chains reachable</div></div>
                  <div className="tl"><div className="tp"><div className="dg"><i></i><i className="on"></i><i></i><i className="on"></i><i className="on"></i><i className="on"></i><i></i><i className="on"></i><i></i></div><span className="bdg">Permissionless</span></div>
                    <div className="v">100+</div><div className="l">DEXes aggregated</div></div>
                </div>
              </div>
            </div>

            <div className="ly s2" id="L2">
              <div className="fr2"></div>
              <div className="sp">
                <div className="lf" id="s2l"><div className="kick" id="s2k">01 · Layer</div>
                  <div className="tt" id="s2t">SWAP</div><div className="sb" id="s2s">Same-chain aggregation</div></div>
                <div className="rt" id="s2r"><p className="ds2" id="s2d"></p></div>
              </div>
              <div className="idx" id="s2i"><i className="on"></i><i></i><i></i><i></i></div>
              <div className="cnt" id="s2c">01 / 04</div>
            </div>

            <div className="ly s3" id="L3">
              <div className="hd" id="s3hd"><div className="kick" id="s3k">Chain reach</div>
                <h2 id="s3h"></h2><p className="ld" id="s3d"></p></div>
              <div className="strip"><div className="track" id="track"></div></div>
              <div className="rail"><i id="railfill" style={{ width: '0%' }}></i></div>
              <div className="cnt3" id="cnt3">01 / 03</div>
            </div>

            <div className="ly s4" id="L4">
              <div className="hd4">
                <div><h2>How value <b>settles.</b></h2><div className="s1l">Five layers. One router. One signature.</div></div>
                <div className="tg">SWAP · CROSS · AGENTS · INTEGRATION · INTENT</div>
              </div>
              <div className="bn" id="bn"></div>
            </div>

            <div className="ly s5" id="L5">
              <div className="scrim"></div>
              <div className="hd5"><div className="kick" style={{ margin: '0' }}>Who builds with EmpX</div><div className="t">One layer, eleven ways in.</div></div>
              <div className="cnt5" id="cnt5">01 / 11</div>
              <div className="band" id="band"><svg className="wires" id="wires"></svg><div id="nodes"></div></div>
              <div className="txt5" id="txt5"><div className="cat5" id="cat5"></div><h5 className="h5" id="h5"></h5>
                <div className="hair"></div><p className="d5" id="d5"></p><div className="ex5" id="ex5"></div></div>
              <div className="pipbar" id="pips"></div>
            </div>

            <div className="ly s8" id="L8">
              <div className="hd8x"><div className="kick" style={{ margin: '0' }}>Why EmpX</div>
                <div className="t">Built to <b>settle,</b> not to bridge.</div>
                <div className="d">Seven reasons the stack holds up — then the long-form case, when it's written.</div></div>
              <div className="pg8" id="pg8">00 / 07 LOCKED</div>
              <div className="bento8" id="bento8">
                <div className="bx dark b1" data-i="0">
                  <svg className="rails" viewBox="0 0 200 160" preserveAspectRatio="xMaxYMid meet">
                    <g fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke">
                      <path d="M0,80 C60,80 70,26 200,26" stroke="rgba(255,138,0,.55)" />
                      <path d="M0,80 C60,80 70,52 200,52" stroke="rgba(255,138,0,.34)" />
                      <path d="M0,80 C60,80 70,78 200,78" stroke="rgba(255,255,255,.30)" />
                      <path d="M0,80 C60,80 70,104 200,104" stroke="rgba(255,138,0,.34)" />
                      <path d="M0,80 C60,80 70,130 200,130" stroke="rgba(255,255,255,.18)" />
                    </g><circle cx="0" cy="80" r="3" fill="#FF8A00" />
                  </svg>
                  <div className="kx">One router</div>
                  <h3>One signature.<br /><b>Every chain.</b></h3>
                  <p>Quote, route and settle through a single contract surface — the rail is chosen per quote, not fixed per config.</p>
                </div>
                <div className="bx b2" data-i="1"><div className="kx">Permissionless</div>
                  <h3>No listing. No solver trust.</h3>
                  <p>Routing runs entirely on-chain. Any token, any pair, no gatekeeping and no off-chain party to rely on.</p></div>
                <div className="bx b3" data-i="2"><div className="kx">Reach</div><h3>Chains reachable</h3>
                  <div className="bignum">180<small>+ via 12 rails</small></div></div>
                <div className="bx b4" data-i="3"><div className="kx">Depth</div><h3>DEXes aggregated</h3>
                  <div className="bignum">100<small>+ on 15+ chains</small></div></div>
                <div className="bx accent b5" data-i="4">
                  <div className="kx" style={{ color: '#D9832B' }}>The thesis</div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginTop: '6px' }}>Five layers.<br /><span style={{ color: '#FF8A00' }}>Every one pluggable.</span></h3>
                  <p>Swap, Cross, Agents, Integration, Intent — each is its own venue. Plug into one layer or build across all five; every one resolves through the same router.</p>
                  <div className="stack">
                    <svg width="150" height="120" viewBox="0 0 160 132" id="stackSvg">
                      <g id="lyr0"><rect x="8" y="6" width="112" height="15" rx="2" fill="rgba(255,138,0,.32)" stroke="#FF8A00" strokeWidth="1.1" />
                        <line x1="120" y1="13.5" x2="140" y2="13.5" stroke="#FF8A00" strokeWidth="1.1" /><circle cx="144" cy="13.5" r="4" fill="#FF8A00" /></g>
                      <g id="lyr1"><rect x="8" y="27" width="112" height="15" rx="2" fill="rgba(255,138,0,.22)" stroke="rgba(255,138,0,.8)" strokeWidth="1.1" />
                        <line x1="120" y1="34.5" x2="140" y2="34.5" stroke="rgba(255,138,0,.8)" strokeWidth="1.1" /><circle cx="144" cy="34.5" r="4" fill="rgba(255,138,0,.8)" /></g>
                      <g id="lyr2"><rect x="8" y="48" width="112" height="15" rx="2" fill="rgba(255,138,0,.14)" stroke="rgba(255,138,0,.6)" strokeWidth="1.1" />
                        <line x1="120" y1="55.5" x2="140" y2="55.5" stroke="rgba(255,138,0,.6)" strokeWidth="1.1" /><circle cx="144" cy="55.5" r="4" fill="rgba(255,138,0,.6)" /></g>
                      <g id="lyr3"><rect x="8" y="69" width="112" height="15" rx="2" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.5)" strokeWidth="1.1" />
                        <line x1="120" y1="76.5" x2="140" y2="76.5" stroke="rgba(255,255,255,.5)" strokeWidth="1.1" /><circle cx="144" cy="76.5" r="4" fill="rgba(255,255,255,.5)" /></g>
                      <g id="lyr4"><rect x="8" y="90" width="112" height="15" rx="2" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.35)" strokeWidth="1.1" />
                        <line x1="120" y1="97.5" x2="140" y2="97.5" stroke="rgba(255,255,255,.35)" strokeWidth="1.1" /><circle cx="144" cy="97.5" r="4" fill="rgba(255,255,255,.35)" /></g>
                    </svg>
                  </div>
                  <div className="soon">Full thesis in progress · chapters TBC</div>
                  <span className="cta8">Notify me when it ships</span>
                </div>
                <div className="bx b6" data-i="5">
                  <div className="ico"><svg viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg></div>
                  <h3>Non-custodial<br />by construction</h3></div>
                <div className="bx b7" data-i="6">
                  <div className="ico"><svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg></div>
                  <h3>Pair-type pricing<br />28 / 15 bps</h3></div>
              </div>
              <div className="mq"><div className="mqin" id="mqin"></div></div>
            </div>

            <div className="ly s6" id="L6">
              <div className="hdx"><div className="kick" style={{ margin: '0' }}>Three ways in</div>
                <div className="t">One engine. <b>Three doors.</b></div>
                <div className="d">SDK, contracts, or the widget — the same router, the same fee, the same signature underneath.</div></div>
              <div className="cntx" id="cnt6">01 / 03</div>
              <div className="hstrip"><div className="htrack" id="track6"></div></div>
              <div className="railx"><i id="rail6" style={{ width: '0%' }}></i></div>
            </div>

            <div className="ly s7" id="L7">
              <div className="hdx"><div className="kick" style={{ margin: '0' }}>Every surface</div>
                <div className="t">One widget. <b>Every surface.</b></div>
                <div className="d">The same component, rendered wherever value moves — a swap, an agent's tool call, a cross-chain route, a wallet tab, a protocol deposit.</div></div>
              <div className="cntx" id="cnt7">01 / 05</div>
              <div className="hstrip"><div className="htrack" id="track7"></div></div>
              <div className="railx"><i id="rail7" style={{ width: '0%' }}></i></div>
            </div>

            <div className="ly s9" id="L9">
              <div className="s9h"><div className="kick" style={{ margin: '0' }}>Start here</div>
                <div className="t9">Plug in. Earn. <b>Ship.</b></div></div>
              <div className="cta3" id="cta3">
                <div className="c3"><h3>Plug in</h3><div className="rule"></div>
                  <p>Widget, SDK, API, or the router contracts direct. Ten lines to a working swap on any supported chain.</p>
                  <div className="art"><svg width="170" height="128" viewBox="0 0 190 150">
                    <circle className="ln" cx="95" cy="75" r="58" /><circle className="ln" id="a1r2" cx="95" cy="75" r="34" />
                    <circle className="lnA" id="a1core" cx="95" cy="75" r="13" />
                    <circle className="lnA" id="a1dot" cx="153" cy="75" r="3.5" fill="#FF8A00" /></svg></div>
                  <div className="foot3">Read the docs →</div></div>
                <div className="c3"><h3>Earn</h3><div className="rule"></div>
                  <p>Every route carries your affiliate address. Ten, twenty-five or fifty percent of protocol fees, settled on-chain.</p>
                  <div className="art"><svg width="170" height="128" viewBox="0 0 190 150">
                    <path className="ln" id="a2path" d="M22,128 C42,128 42,66 62,66 C82,66 82,110 102,110 C122,110 122,48 142,48" />
                    <path className="lnA" d="M142,120 L142,34 M142,34 L132,46 M142,34 L152,46" />
                    <circle className="lnA" id="a2dot" cx="22" cy="128" r="3.5" fill="#FF8A00" /></svg></div>
                  <div className="foot3" data-open="Affiliate" style={{ cursor: 'pointer' }}>Affiliate tiers →</div></div>
                <div className="c3"><h3>Ship</h3><div className="rule"></div>
                  <p>Branded UI, rails wired both ways, agent SDK registered with your chain. Live in under thirty days.</p>
                  <div className="art"><svg width="170" height="128" viewBox="0 0 190 150">
                    <circle className="ln" id="a3c1" cx="72" cy="75" r="40" /><circle className="lnA" id="a3c2" cx="112" cy="75" r="26" />
                    <circle className="ln" id="a3c3" cx="146" cy="75" r="14" /><circle className="ln" cx="36" cy="75" r="8" /></svg></div>
                  <div className="foot3" data-open="Partnership" style={{ cursor: 'pointer' }}>Talk to us →</div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="ftr">
          <div className="ftrCols">
            <div className="brandcol">
              <div className="bmark"><img id="fmark" alt="EmpX" /><span>EmpX</span></div>
              <div className="socials">
                <a href="#" aria-label="X"><svg viewBox="0 0 24 24"><path d="M18.9 2H22l-7.1 8.1L23 22h-6.6l-5.2-6.8L5.3 22H2.2l7.6-8.7L1.5 2h6.8l4.7 6.2zM17.8 20.2h1.7L7.3 3.7H5.5z" /></svg></a>
                <a href="#" aria-label="GitHub"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .3.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10 10 0 0 0 12 2z" /></svg></a>
              </div>
            </div>
            <div><h4>Product</h4><ul><li><a href="#">Swap</a></li><li><a href="#">Cross-chain</a></li><li><a href="#">Multi-send</a></li><li><a href="#">Gas top-up</a></li><li><a href="#">Portfolio</a></li></ul></div>
            <div><h4>Build</h4><ul><li><a href="#">Swap SDK</a></li><li><a href="#">MCP server</a></li><li><a href="#">Widget</a></li><li><a href="#">API reference</a></li><li><a href="#">Contracts</a></li></ul></div>
            <div><h4>Network</h4><ul><li><a href="#">Chains</a></li><li><a href="#">Rails</a></li><li><a href="#">DEX coverage</a></li><li><a href="#">Status</a></li><li><a href="#">Fees</a></li></ul></div>
            <div><h4>Company</h4><ul><li><a href="#">Whitepaper</a></li><li><a href="#" data-open="Affiliate">Affiliate program</a></li><li><a href="#">Brand kit</a></li><li><a href="#">Terms</a></li><li><a href="#">Privacy</a></li></ul></div>
          </div>
          <div className="ftrBase"><span>© EmpX · The settlement layer for every chain</span><span>Built on-chain · Non-custodial</span></div>
        </div>

        <div className="ovl" id="ovl">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mTitleH">
            <form id="frm" noValidate>
              <input type="text" id="f_hp" name="hp" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: '0' }} aria-hidden="true" />
              <div className="mHead">
                <div className="mBrand"><img id="mMark" alt="EmpX" />
                  <div><div className="bt">EmpX</div><div className="bs">Settlement layer</div></div></div>
                <button type="button" className="mClose" id="mClose" aria-label="Close">×</button>
              </div>
              <div className="mTitle">
                <h3 id="mTitleH">Let's <b>build together.</b></h3>
                <p>Tell us what you're reaching out about and we'll route it to the right person.</p>
              </div>
              <div className="mBody">
                <label className="lbl">Purpose <span className="req">*</span></label>
                <div className="chips" id="chips"></div>
                <div className="err" id="errPurpose">Pick what this is about.</div>

                <div className="grid2">
                  <div className="fld"><label className="lbl" htmlFor="f_name">Name <span className="req">*</span></label>
                    <input className="inp" id="f_name" name="name" placeholder="Jane Doe" autoComplete="name" /></div>
                  <div className="fld"><label className="lbl" htmlFor="f_role">Position</label>
                    <input className="inp" id="f_role" name="position" placeholder="Head of BD" /></div>
                  <div className="fld"><label className="lbl" htmlFor="f_org">Company <span className="req">*</span></label>
                    <input className="inp" id="f_org" name="company" placeholder="Acme Protocol" /></div>
                  <div className="fld"><label className="lbl" htmlFor="f_site">Website</label>
                    <input className="inp" id="f_site" name="website" placeholder="acme.xyz" /></div>
                  <div className="fld"><label className="lbl" htmlFor="f_x">X</label>
                    <input className="inp" id="f_x" name="x" placeholder="@acme" /></div>
                  <div className="fld"><label className="lbl" htmlFor="f_tg">Telegram</label>
                    <input className="inp" id="f_tg" name="telegram" placeholder="@acme" /></div>
                </div>
                <div className="err" id="errFields">Name and company are required.</div>

                <div className="fld" style={{ marginBottom: '15px' }}>
                  <label className="lbl" htmlFor="f_email">Reply-to email <span className="req">*</span></label>
                  <input className="inp" id="f_email" name="email" placeholder="jane@acme.xyz" autoComplete="email" />
                  <div className="err" id="errEmail">We need a valid address to reply to.</div>
                </div>

                <div className="fld" style={{ marginBottom: '15px' }}>
                  <label className="lbl" htmlFor="f_head">Heading — purpose for reaching out <span className="req">*</span></label>
                  <input className="inp" id="f_head" name="heading" placeholder="Adding EmpX swap to our wallet" />
                  <div className="err" id="errHead">Give it a one-line heading.</div>
                </div>

                <div className="fld">
                  <label className="lbl" htmlFor="f_desc">Description <span className="req">*</span></label>
                  <textarea className="ta" id="f_desc" name="description" placeholder="What you're building, what you need from us, rough timelines, expected volume…"></textarea>
                  <div className="err" id="errDesc">A couple of sentences is plenty.</div>
                </div>

                <div className="mFoot">
                  <div className="mNote">Routed to the right desk automatically.<br /><b>Typical reply within two business days.</b></div>
                  <button type="submit" className="submit" id="btnSend">Send enquiry</button>
                </div>
              </div>
            </form>

            <div className="done" id="done">
              <div className="tick"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg></div>
              <h4>Enquiry <b>sent.</b></h4>
              <p id="doneMsg">We've routed it to the right desk. Expect a reply within two business days.</p>
            </div>
          </div>
        </div>
    </div>
  );
}
