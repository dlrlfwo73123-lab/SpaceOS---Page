import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataSourcePanel } from './DataSourcePanel';

const mockSource = {
  id: 'vacancy-rate',
  label: '공실률',
  intended_source: '소상공인시장진흥공단 상가업소 DB',
  refresh_cadence: 'quarterly',
  status: 'mock',
  live_adapter_implemented: false,
};

const mockFreshness = {
  source_id: 'vacancy-rate',
  is_demo: true,
  as_of: null,
  staleness: 'unknown_mock_source',
};

describe('DataSourcePanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      const body = url.includes('data-freshness') ? [mockFreshness] : [mockSource];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the source label and a 데모 데이터 badge once loaded', async () => {
    render(<DataSourcePanel />);
    await waitFor(() => expect(screen.getByText('공실률')).toBeInTheDocument());
    expect(screen.getByText('데모 데이터')).toBeInTheDocument();
  });
});
