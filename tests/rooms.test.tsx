import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Render RoomsPage via dynamic import to avoid module resolution issues
import RoomsPage from '../src/app/routes/Rooms';

vi.mock('../src/app/routes/SOM/components/TopNav', () => ({ default: () => <div data-testid="topnav" /> }));

beforeAll(() => {
  // @ts-ignore
  globalThis.originalLocation = globalThis.location;
  // @ts-ignore
  delete (globalThis as any).location;
  // @ts-ignore
  globalThis.location = { search: '?jobId=test-job', href: '/', assign: () => {} } as any;
});

afterAll(() => {
  // @ts-ignore
  globalThis.location = globalThis.originalLocation;
});

function setupLocalStorageRooms() {
  const rooms = [
    { id: 'r1', name: 'Kitchen', baseName: 'Kitchen', finish: 'Painted', cabinetType: 'Face Frame/Painted' },
    { id: 'r2', name: 'Bath', baseName: 'Bath', finish: 'Painted', cabinetType: 'Face Frame/Painted' },
  ];
  localStorage.setItem('cc.rooms.test-job.v1', JSON.stringify(rooms));
}

describe('Rooms delete/undo', () => {
  beforeEach(() => {
    localStorage.clear();
    setupLocalStorageRooms();
  });

  test('deletes a room and allows undo', async () => {
    render(<RoomsPage />);

    // ensure both rows are present
    expect(screen.getByRole('textbox', { name: 'Room name for Kitchen' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Room name for Bath' })).toBeInTheDocument();

    // open context menu on first row (right-click the input)
    const kitchenInput = screen.getByRole('textbox', { name: 'Room name for Kitchen' });
    fireEvent.contextMenu(kitchenInput);

    // click delete in context menu
    const deleteBtn = await screen.findByRole('menuitem', { name: /Delete room/i });
    fireEvent.click(deleteBtn);

    // Kitchen should be removed
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Room name for Kitchen' })).not.toBeInTheDocument());

    // Undo toast should be visible
    const undo = screen.getByRole('button', { name: /Undo/i });
    expect(undo).toBeInTheDocument();

    // click undo
    fireEvent.click(undo);

    // Kitchen should be back
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Room name for Kitchen' })).toBeInTheDocument());
  }, 10000);
});
