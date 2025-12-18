type Props = {
  title: string;
  value: string;
  canCopy: boolean;
  canOpenCalendar: boolean;
  canDownloadIcs: boolean;
  onCopy: () => void;
  onOpenCalendar: () => void;
  onDownloadIcs: () => void;
};

export function ActionOutputPanel(props: Props): React.JSX.Element {
  return (
    <section className="output-panel">
      <div className="row-between">
        <div className="meta-title">{props.title}</div>
        <div className="button-row">
          <button
            className="btn btn-ghost btn-small"
            data-testid="copy-output"
            disabled={!props.canCopy}
            onClick={() => {
              props.onCopy();
            }}
            type="button"
          >
            コピー
          </button>
          <button
            className="btn btn-ghost btn-small"
            data-testid="open-calendar"
            disabled={!props.canOpenCalendar}
            onClick={() => {
              props.onOpenCalendar();
            }}
            type="button"
          >
            カレンダー
          </button>
          <button
            className="btn btn-ghost btn-small"
            data-testid="download-ics"
            disabled={!props.canDownloadIcs}
            onClick={() => {
              props.onDownloadIcs();
            }}
            type="button"
          >
            .ics
          </button>
        </div>
      </div>
      <textarea
        className="summary-output summary-output--sm"
        data-testid="action-output"
        readOnly
        value={props.value}
      />
    </section>
  );
}
