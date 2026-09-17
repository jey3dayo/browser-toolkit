import { useCallback, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/shared/Button";
import { RowBetween } from "@/components/shared/Layout";
import { t } from "@/i18n";
import type { BlocklistState } from "@/search-blocklist/types";

export type CountBarProps = {
  state: BlocklistState;
};

export function CountBar(props: CountBarProps): React.JSX.Element | null {
  const snapshot = useSyncExternalStore(
    props.state.subscribe,
    props.state.getSnapshot
  );
  const [revealed, setRevealed] = useState(false);

  const handleToggle = useCallback(() => {
    const next = !revealed;
    setRevealed(next);
    props.state.setRevealed(next);
  }, [props.state, revealed]);

  if (snapshot.blockedCount === 0) {
    return null;
  }

  return (
    <div className="mbu-countbar">
      <RowBetween>
        <span>
          {t("searchBlocklist.countBar.summary", {
            count: snapshot.blockedCount,
          })}
        </span>
        <Button
          onClick={handleToggle}
          size="small"
          type="button"
          variant="ghost"
        >
          {revealed
            ? t("searchBlocklist.countBar.hide")
            : t("searchBlocklist.countBar.reveal")}
        </Button>
      </RowBetween>
    </div>
  );
}
