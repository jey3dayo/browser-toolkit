import { Button } from "@/components/shared/Button";
import { Form } from "@/components/shared/Form";
import { Input } from "@/components/shared/Input";
import { PatternInputRow } from "@/components/shared/Layout";
import { Select } from "@/components/shared/Select";
import { t } from "@/i18n";
import { isSearchEngineEncoding } from "@/schemas/search_engine_encoding";
import {
  ENCODING_LABELS,
  SEARCH_ENGINE_ENCODINGS,
  type SearchEngineEncoding,
} from "@/search_engine_types";

export type SearchEngineAddFormProps = {
  nameInput: string;
  onNameInputChange: (value: string) => void;
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  encodingInput: SearchEngineEncoding;
  onEncodingInputChange: (value: SearchEngineEncoding) => void;
  onAddEngine: () => Promise<void>;
};

export function SearchEngineAddForm(
  props: SearchEngineAddFormProps
): React.JSX.Element {
  const submitAddEngine = (): void => {
    props.onAddEngine().catch(() => {
      // no-op
    });
  };

  return (
    <Form onFormSubmit={submitAddEngine} variant="patternGroupWrap">
      <PatternInputRow>
        <Input
          data-testid="search-engine-name"
          onValueChange={props.onNameInputChange}
          placeholder={t("searchEngines.namePlaceholder")}
          type="text"
          value={props.nameInput}
          variant="pattern"
        />
        <Select
          ariaLabel={t("searchEngines.encoding")}
          onValueChange={(value) => {
            if (isSearchEngineEncoding(value)) {
              props.onEncodingInputChange(value);
            }
          }}
          options={SEARCH_ENGINE_ENCODINGS.map((enc) => ({
            label: ENCODING_LABELS[enc],
            value: enc,
          }))}
          triggerTestId="search-engine-encoding"
          value={props.encodingInput}
          variant="pattern"
        />
      </PatternInputRow>
      <PatternInputRow>
        <Input
          data-testid="search-engine-url"
          onValueChange={props.onUrlInputChange}
          placeholder="URLテンプレート（例: https://google.com/search?q={query}）"
          type="text"
          value={props.urlInput}
          variant="pattern"
        />
        <Button
          data-testid="add-search-engine"
          onClick={submitAddEngine}
          size="small"
          type="button"
          variant="ghost"
        >
          {t("common.add")}
        </Button>
      </PatternInputRow>
    </Form>
  );
}
