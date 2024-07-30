import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Box, IconButton, ListItemButton, ListItemDecorator } from '@mui/joy';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import SettingsIcon from '@mui/icons-material/Settings';

import { DLLM, DLLMId, DModelSourceId, useModelsStore } from '~/modules/llms/store-llms';
import { findVendorById } from '~/modules/llms/vendors/vendors.registry';

import { DebouncedInputMemo } from '~/common/components/DebouncedInput';
import { DropdownItems, PageBarDropdownMemo } from '~/common/layout/optima/components/PageBarDropdown';
import { GoodTooltip } from '~/common/components/GoodTooltip';
import { KeyStroke } from '~/common/components/KeyStroke';
import { useOptimaLayout } from '~/common/layout/optima/useOptimaLayout';


function LLMDropdown(props: {
  llms: DLLM[],
  chatLlmId: DLLMId | null,
  setChatLlmId: (llmId: DLLMId | null) => void,
  placeholder?: string,
}) {

  // state
  const [filterString, setfilterString] = React.useState<string | null>(null);

  // external state
  const { openLlmOptions, openModelsSetup } = useOptimaLayout();

  // derived state
  const { chatLlmId, llms, setChatLlmId } = props;

  const llmsCount = llms.filter(llm => !llm.hidden).length;
  const showFilter = llmsCount >= 50;

  const handleChatLLMChange = React.useCallback((value: DLLMId | null) => {
    value && setChatLlmId(value);
  }, [setChatLlmId]);

  const handleOpenLLMOptions = React.useCallback(() => {
    return chatLlmId && openLlmOptions(chatLlmId);
  }, [chatLlmId, openLlmOptions]);


  const llmDropdownItems: DropdownItems = React.useMemo(() => {
    const llmItems: DropdownItems = {};
    let prevSourceId: DModelSourceId | null = null;
    let sepCount = 0;

    const lcFilterString = filterString?.toLowerCase();
    const filteredLLMs = llms.filter(llm => {
      if (chatLlmId && llm.id === chatLlmId)
        return true;

      // filter-out models that don't contain the search string
      if (lcFilterString && !llm.label.toLowerCase().includes(lcFilterString))
        return false;

      // filter-out hidden models from the dropdown
      return lcFilterString ? true : !llm.hidden;
    });

    for (const llm of filteredLLMs) {
      // add separators when changing sources
      if (!prevSourceId || llm.sId !== prevSourceId) {
        const llmVendor = findVendorById(llm._source?.vId ?? undefined);
        const sourceName = llmVendor?.name || llm.sId;
        llmItems[`sep-${llm.id}`] = {
          type: 'separator',
          title: sourceName,
          icon: llmVendor?.Icon ? <llmVendor.Icon /> : undefined,
        };
        prevSourceId = llm.sId;
        sepCount++;
      }

      // add the model item
      llmItems[llm.id] = {
        title: llm.label,
        // icon: llm.id.startsWith('some vendor') ? <VendorIcon /> : undefined,
      };
    }
    // if there's a single separator (i.e. only one source), remove it
    if (sepCount === 1) {
      for (const key in llmItems) {
        if (key.startsWith('sep-')) {
          delete llmItems[key];
          break;
        }
      }
    }
    return llmItems;
  }, [chatLlmId, llms, filterString]);


  // "Model Options" button (only on the active item)
  const llmDropdownButton = React.useMemo(() => (
    <GoodTooltip title={
      <Box sx={{ px: 1, py: 0.75, lineHeight: '1.5rem' }}>
        Model Options
        <KeyStroke combo='Ctrl + Shift + O' sx={{ my: 0.5 }} />
      </Box>
    }>
      <IconButton
        variant='outlined' color='neutral'
        onClick={handleOpenLLMOptions}
        sx={{
          ml: 'auto',
          // mr: -0.5,
          my: '-0.25rem' /* absorb the menuItem padding */,
          backgroundColor: 'background.surface',
          boxShadow: 'xs',
        }}
      >
        <SettingsIcon sx={{ fontSize: 'xl' }} />
      </IconButton>
    </GoodTooltip>
  ), [handleOpenLLMOptions]);


  // "Models Filter" box
  const llmDropdownPrependOptions = React.useMemo(() =>
    !showFilter ? undefined : (
      <Box sx={{ p: 1 }}>
        <DebouncedInputMemo
          aggressiveRefocus
          debounceTimeout={300}
          onDebounce={setfilterString}
          placeholder={`Search ${llmsCount} models...`}
        />
      </Box>
    ), [showFilter, llmsCount]);

  // [effect] clear filter when the active model changes
  // Note: this doesn't work because the debounced component holds the filter string
  // React.useEffect(() => {
  //   if (chatLlmId) {
  //     setsearchQuery(null);
  //     console.log('cleared');
  //   }
  // }, [chatLlmId]);


  // "Models Setup" button
  const llmDropdownAppendOptions = React.useMemo(() => <>

    {/*{chatLlmId && (*/}
    {/*  <ListItemButton key='menu-opt' onClick={handleOpenLLMOptions}>*/}
    {/*    <ListItemDecorator><SettingsIcon color='success' /></ListItemDecorator>*/}
    {/*    <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', gap: 1 }}>*/}
    {/*      Options*/}
    {/*      <KeyStroke combo='Ctrl + Shift + O' />*/}
    {/*    </Box>*/}
    {/*  </ListItemButton>*/}
    {/*)}*/}

    <ListItemButton key='menu-llms' onClick={openModelsSetup}>
      <ListItemDecorator><BuildCircleIcon color='success' /></ListItemDecorator>
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        Models
        <KeyStroke combo='Ctrl + Shift + M' sx={{ ml: 2 }} />
      </Box>
    </ListItemButton>

  </>, [openModelsSetup]);


  return (
    <PageBarDropdownMemo
      items={llmDropdownItems}
      value={chatLlmId}
      onChange={handleChatLLMChange}
      placeholder={props.placeholder || 'Models …'}
      prependOption={llmDropdownPrependOptions}
      appendOption={llmDropdownAppendOptions}
      activeEndDecorator={llmDropdownButton}
    />
  );
}


export function useChatLLMDropdown() {
  // external state
  const { llms, chatLLMId, setChatLLMId } = useModelsStore(useShallow(state => ({
    llms: state.llms, // NOTE: we don't need a deep comparison as we reference the same array
    chatLLMId: state.chatLLMId,
    setChatLLMId: state.setChatLLMId,
  })));

  const chatLLMDropdown = React.useMemo(
    () => <LLMDropdown llms={llms} chatLlmId={chatLLMId} setChatLlmId={setChatLLMId} />,
    [llms, chatLLMId, setChatLLMId],
  );

  return { chatLLMId, chatLLMDropdown };
}

/*export function useTempLLMDropdown(props: { initialLlmId: DLLMId | null }) {
  // local state
  const [llmId, setLlmId] = React.useState<DLLMId | null>(props.initialLlmId);

  // external state
  const llms = useModelsStore(state => state.llms);

  const chatLLMDropdown = React.useMemo(
    () => <LLMDropdown llms={llms} llmId={llmId} setLlmId={setLlmId} />,
    [llms, llmId, setLlmId],
  );

  return { llmId, chatLLMDropdown };
}*/