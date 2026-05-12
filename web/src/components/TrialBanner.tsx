/**
 * Banner shown only while the site is pointing at the mainnet *trial*
 * contract (ERC20 symbol "DMNT"). Makes it unambiguous to visitors that
 * this is a throwaway dry-run, not the real launch — so nobody puts
 * meaningful money into the trial pool by accident.
 *
 * Remove this component (and its import in page.tsx) once we redeploy
 * the production contract on main and point DAEMON_ADDRESS at it.
 */
export function TrialBanner() {
  return (
    <div
      className="w-full px-6 py-3 text-sm font-mono flex items-center justify-center gap-2 flex-wrap"
      style={{
        background: "#3a2a08",
        color: "#fde68a",
        borderBottom: "1px solid #5a4010",
      }}
    >
      <span aria-hidden>⚠</span>
      <strong>MAINNET TRIAL</strong>
      <span>—</span>
      <span>
        this is a temporary contract (
        <code style={{ color: "#fef3c7" }}>Daemon Test / DMNT</code>) used to
        validate the V4 lifecycle on real mainnet.
      </span>
      <span>
        Tokens minted here have <strong>no long-term value</strong>;
        production deploy with the real <code>DMN</code> symbol follows
        after this dry-run succeeds.
      </span>
    </div>
  );
}
