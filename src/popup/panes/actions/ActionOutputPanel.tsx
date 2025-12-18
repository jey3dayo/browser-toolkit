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
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{props.title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
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
      <textarea data-testid="action-output" readOnly style={{ width: '100%', minHeight: 120 }} value={props.value} />
    </div>
  );
}
