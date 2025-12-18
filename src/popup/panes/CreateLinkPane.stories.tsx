import type { Meta, StoryObj } from '@storybook/react-vite';

import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { createStoryPopupRuntime } from '../storybook/createStoryPopupRuntime';
import { CreateLinkPane } from './CreateLinkPane';
import type { PopupPaneBaseProps } from './types';

function CreateLinkPaneStory(props: PopupPaneBaseProps): React.JSX.Element {
  return <CreateLinkPane notify={props.notify} runtime={props.runtime} />;
}

const meta = {
  title: 'Popup/CreateLinkPane',
  component: CreateLinkPaneStory,
  tags: ['test'],
  argTypes: {
    runtime: { control: false },
    notify: { control: false },
  },
} satisfies Meta<typeof CreateLinkPaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    runtime: createStoryPopupRuntime({
      activeTab: { id: 1, title: 'Example', url: 'https://example.com/path?q=1' },
    }),
    notify: { info: fn(), success: fn(), error: fn() },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      const output = canvas.getByTestId('create-link-output') as HTMLTextAreaElement;
      expect(output.value).toBe('[Example](<https://example.com/path?q=1>)');
    });

    await userEvent.click(canvas.getByTestId('create-link-format'));
    await waitFor(() => {
      expect(canvasElement.ownerDocument.querySelector('.mbu-select-popup')).toBeTruthy();
    });
    const popup = canvasElement.ownerDocument.querySelector<HTMLElement>('.mbu-select-popup');
    if (!popup) throw new Error('Select popup not found');
    await userEvent.click(within(popup).getByText('HTML <a>'));

    await waitFor(() => {
      const output = canvas.getByTestId('create-link-output') as HTMLTextAreaElement;
      expect(output.value).toBe('<a href="https://example.com/path?q=1">Example</a>');
    });
  },
};
