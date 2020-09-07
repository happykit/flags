import '@testing-library/jest-dom/extend-expect';
import '@testing-library/jest-dom';
import * as React from 'react';
import 'jest-fetch-mock';
import { useFlags, configure, _resetConfig } from '../src';
import { render, screen, waitFor } from '@testing-library/react';

const Component = () => {
  const flags = useFlags();

  return <p>{flags.aFlag ? 'hello' : 'waiting'}</p>;
};

beforeEach(() => {
  _resetConfig();
});

describe('exports', () => {
  it('exports a configure function', () => {
    expect(typeof configure).toBe('function');
  });

  it('exports a useFlags hook', () => {
    expect(typeof useFlags).toBe('function');
  });
});

describe('renders', () => {
  it('renders without crashing', async () => {
    fetchMock.mockOnce(JSON.stringify({ aFlag: true }), {
      headers: { 'content-type': 'application/json' },
    });
    configure({ endpoint: 'http://localhost:1234', clientId: 'foo' });
    render(<Component />);
    await waitFor(() => {
      expect(screen.queryByText('hello')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:1234', {
      body: '{"envKey":"foo"}',
      method: 'POST',
    });
  });
});
