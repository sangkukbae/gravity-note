import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NoteDeleteModal } from '@/components/notes/note-delete-modal'

describe('NoteDeleteModal', () => {
  const defaultProps = {
    isOpen: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
    notePreview:
      'This is a test note content that should be displayed in preview',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal when open', () => {
    render(<NoteDeleteModal {...defaultProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete Note')).toBeInTheDocument()
    expect(
      screen.getByText(/Are you sure you want to delete/)
    ).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<NoteDeleteModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('displays note preview when provided', () => {
    render(<NoteDeleteModal {...defaultProps} />)

    expect(screen.getByText('Note content:')).toBeInTheDocument()
    expect(
      screen.getByText(`"${defaultProps.notePreview}"`)
    ).toBeInTheDocument()
  })

  it('truncates long note preview', () => {
    const longNote = 'a'.repeat(150)
    render(<NoteDeleteModal {...defaultProps} notePreview={longNote} />)

    const truncatedText = longNote.substring(0, 100) + '...'
    expect(screen.getByText(`"${truncatedText}"`)).toBeInTheDocument()
  })

  it('shows fallback text when no preview provided', () => {
    render(<NoteDeleteModal {...defaultProps} notePreview={undefined} />)

    expect(screen.getByText(/delete this note/)).toBeInTheDocument()
  })

  it('calls onConfirm when delete button is clicked', async () => {
    const mockOnConfirm = vi.fn().mockResolvedValue(undefined)
    render(<NoteDeleteModal {...defaultProps} onConfirm={mockOnConfirm} />)

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    expect(mockOnConfirm).toHaveBeenCalledOnce()
  })

  it('calls onOpenChange when cancel button is clicked', () => {
    render(<NoteDeleteModal {...defaultProps} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange when X button is clicked', () => {
    render(<NoteDeleteModal {...defaultProps} />)

    const closeButton = screen.getByRole('button', { name: /cancel deletion/i })
    fireEvent.click(closeButton)

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables buttons and shows loading state', () => {
    render(<NoteDeleteModal {...defaultProps} isLoading={true} />)

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    const closeButton = screen.getByRole('button', { name: /cancel deletion/i })

    expect(deleteButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
    expect(closeButton).toBeDisabled()

    // Should show loading spinner
    expect(
      screen.getByTestId(/loader/i) || screen.getByRole('progressbar')
    ).toBeInTheDocument()
  })

  it('prevents outside clicks during loading', () => {
    const { container } = render(
      <NoteDeleteModal {...defaultProps} isLoading={true} />
    )

    const backdrop = container.querySelector('[data-radix-dialog-overlay]')
    if (backdrop) {
      fireEvent.pointerDown(backdrop)
      expect(defaultProps.onOpenChange).not.toHaveBeenCalled()
    }
  })

  it('shows warning message about permanent deletion', () => {
    render(<NoteDeleteModal {...defaultProps} />)

    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    expect(
      screen.getByText(
        /permanently delete the note and any associated attachments/
      )
    ).toBeInTheDocument()
  })

  it('closes modal after successful deletion', async () => {
    const mockOnConfirm = vi.fn().mockResolvedValue(undefined)
    const mockOnOpenChange = vi.fn()

    render(
      <NoteDeleteModal
        {...defaultProps}
        onConfirm={mockOnConfirm}
        onOpenChange={mockOnOpenChange}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('handles deletion error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockOnConfirm = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<NoteDeleteModal {...defaultProps} onConfirm={mockOnConfirm} />)

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete note:',
        expect.any(Error)
      )
    })

    // Modal should remain open on error
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('has proper accessibility attributes', () => {
    render(<NoteDeleteModal {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby')

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    const closeButton = screen.getByRole('button', { name: /cancel deletion/i })

    expect(deleteButton).toBeInTheDocument()
    expect(cancelButton).toBeInTheDocument()
    expect(closeButton).toHaveAttribute('aria-label', 'Cancel deletion')
  })
})
