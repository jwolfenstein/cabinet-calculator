import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import RoomsPage from '../index';

// Mock TopNav used by the page
import { vi } from 'vitest';
vi.mock('../../SOM/components/TopNav', () => ({
  default: () => <div data-testid="topnav" />
}));

// Provide a fake location.search with jobId so the page doesn't early-return
const originalLocation = window.location;

beforeAll(() => {
  // @ts-ignore
  delete window.location;
  // @ts-ignore
  window.location = { search: '?jobId=test-job', href: '/', assign: vi.fn() };
});

afterAll(() => {
  // @ts-ignore - Restoring original location
  window.location = originalLocation;
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

    // open context menu on first row
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
