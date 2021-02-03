import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useFlags, useFeatureFlags, configure } from '../.';

type Flags = {
  booleanFlag: boolean;
  numericFlag: number;
  textualFlag: 'profileA' | 'profileB';
};

const useProd = false;

configure<Partial<Flags>>({
  endpoint: useProd ? undefined : 'http://localhost:8787/api/flags',
  envKey: useProd
    ? 'flags_pub_277203581177692685'
    : 'flags_pub_272357356657967622',
  defaultFlags: {},
});

// const App = () => {
//   const flags = useFlags<Flags>();
//   // flags.booleanFlag; // has type "boolean"
//   // flags.numericFlag; // has type "number"
//   // flags.textualFlag; // has type "string"
//   return <pre>{JSON.stringify(flags, null, 2)}</pre>;
// };

const App = () => {
  const response = useFeatureFlags<Flags>();
  return <pre>{JSON.stringify(response, null, 2)}</pre>;
};

ReactDOM.render(<App />, document.getElementById('root'));
