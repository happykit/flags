import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useFlags, configure } from '../.';

type Flags = {
  booleanFlag: boolean;
  numericFlag: number;
  textualFlag: 'profileA' | 'profileB';
};

configure<Partial<Flags>>({
  // endpoint: 'http://localhost:8787/',
  envKey: 'flags_pub_277203581177692685',
  defaultFlags: { booleanFlag: true },
});

const App = () => {
  const flags = useFlags<Flags>();
  // flags.booleanFlag; // has type "boolean"
  // flags.numericFlag; // has type "number"
  // flags.textualFlag; // has type "string"
  return <div>{JSON.stringify(flags, null, 2)}</div>;
};

ReactDOM.render(<App />, document.getElementById('root'));
