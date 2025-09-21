// MetaPromptContext.js
import React from 'react';

export const MetaPromptContext = React.createContext({
  metaPrompt: '',
  setMetaPrompt: () => {},
});

export function MetaPromptProvider({ children }) {
  const [metaPrompt, setMetaPrompt] = React.useState('');
  return (
    <MetaPromptContext.Provider value={{ metaPrompt, setMetaPrompt }}>
      {children}
    </MetaPromptContext.Provider>
  );
}
