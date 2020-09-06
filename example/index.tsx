import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useFlags, configure } from '../.';

configure({
  endpoint: 'http://localhost:8787/',
  clientId: 'flags_pub_272357356657967622',
});

const App = () => {
  const flags = useFlags();
  return <div>{JSON.stringify(flags, null, 2)}</div>;
};

ReactDOM.render(<App />, document.getElementById('root'));
