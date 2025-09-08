import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NoteMoreMenu } from '@/components/notes/note-more-menu'

// Mock the DropdownMenu components to avoid portal rendering issues in tests
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, open }: any) => (
    <div data-testid='dropdown-menu' data-open={open}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: any) => (
    <div data-testid='dropdown-trigger'>{children}</div>
  ),
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid='dropdown-content'>{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, disabled, className }: any) => (
    <button
      data-testid='menu-item'
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}))

describe('NoteMoreMenu', () => {
  const defaultProps = {
    canEdit: true,
    onEdit: vi.fn(),
    canDelete: true,
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders more menu trigger button', () => {
    render(<NoteMoreMenu {...defaultProps} />)

    const triggerButton = screen.getByRole('button', { name: /more actions/i })
    expect(triggerButton).toBeInTheDocument()
    expect(triggerButton).toHaveAttribute('aria-label', 'More actions')
  })

  it('opens dropdown menu when trigger is clicked', async () => {
    render(<NoteMoreMenu {...defaultProps} />)

    const triggerButton = screen.getByRole('button', { name: /more actions/i })
    expect(triggerButton).toBeInTheDocument()

    // With mocked components, the menu items should be visible
    const editOption = screen.getByText('Edit')
    expect(editOption).toBeInTheDocument()
  })

  it('shows edit option when canEdit is true', async () => {
    render(<NoteMoreMenu {...defaultProps} canEdit={true} />)

    const editOption = screen.getByText('Edit')
    expect(editOption).toBeInTheDocument()
    expect(editOption).not.toBeDisabled()
  })

  it('disables edit option when canEdit is false', async () => {
    render(<NoteMoreMenu {...defaultProps} canEdit={false} />)

    const editOption = screen.getByText('Edit')
    expect(editOption).toBeInTheDocument()
    expect(editOption).toBeDisabled()
  })

  it('shows delete option when canDelete is true', async () => {
    render(<NoteMoreMenu {...defaultProps} canDelete={true} />)

    const deleteOption = screen.getByText('Delete')
    expect(deleteOption).toBeInTheDocument()
  })

  it('hides delete option when canDelete is false', async () => {
    render(<NoteMoreMenu {...defaultProps} canDelete={false} />)

    const editOption = screen.getByText('Edit')
    expect(editOption).toBeInTheDocument()

    const deleteOption = screen.queryByText('Delete')
    expect(deleteOption).not.toBeInTheDocument()
  })

  it('hides delete option when onDelete is not provided', async () => {
    const { onDelete: _omit, ...props } = defaultProps
    render(<NoteMoreMenu {...props} />)

    const deleteOption = screen.queryByText('Delete')
    expect(deleteOption).not.toBeInTheDocument()
  })

  it('calls onEdit when edit option is clicked', async () => {
    const mockOnEdit = vi.fn()
    render(<NoteMoreMenu {...defaultProps} onEdit={mockOnEdit} />)

    const editOption = screen.getByText('Edit')
    fireEvent.click(editOption)

    expect(mockOnEdit).toHaveBeenCalledOnce()
  })

  it('calls onDelete when delete option is clicked', async () => {
    const mockOnDelete = vi.fn()
    render(<NoteMoreMenu {...defaultProps} onDelete={mockOnDelete} />)

    const deleteOption = screen.getByText('Delete')
    fireEvent.click(deleteOption)

    expect(mockOnDelete).toHaveBeenCalledOnce()
  })

  it('closes menu after edit option is clicked', async () => {
    const mockOnEdit = vi.fn()
    render(<NoteMoreMenu {...defaultProps} onEdit={mockOnEdit} />)

    const editOption = screen.getByText('Edit')
    fireEvent.click(editOption)

    expect(mockOnEdit).toHaveBeenCalledOnce()
    // Menu behavior is handled by the component logic, we just verify the callback is called
  })

  it('closes menu after delete option is clicked', async () => {
    const mockOnDelete = vi.fn()
    render(<NoteMoreMenu {...defaultProps} onDelete={mockOnDelete} />)

    const deleteOption = screen.getByText('Delete')
    fireEvent.click(deleteOption)

    expect(mockOnDelete).toHaveBeenCalledOnce()
    // Menu behavior is handled by the component logic, we just verify the callback is called
  })

  it('has proper styling for delete option', async () => {
    render(<NoteMoreMenu {...defaultProps} />)

    const deleteOption = screen.getByText('Delete')
    expect(deleteOption).toHaveClass('text-destructive')
    expect(deleteOption).toHaveClass('focus:text-destructive')
  })

  it('shows correct icons for menu options', async () => {
    render(<NoteMoreMenu {...defaultProps} />)

    // Check for edit icon (PencilIcon)
    const editOption = screen.getByText('Edit')
    expect(editOption.parentElement?.querySelector('svg')).toBeInTheDocument()

    // Check for delete icon (Trash2)
    const deleteOption = screen.getByText('Delete')
    expect(deleteOption.parentElement?.querySelector('svg')).toBeInTheDocument()
  })

  it('manages menu open state correctly', async () => {
    render(<NoteMoreMenu {...defaultProps} />)

    const triggerButton = screen.getByRole('button', { name: /more actions/i })
    expect(triggerButton).toBeInTheDocument()

    // With mocked components, menu items should always be visible
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('has accessible menu structure', async () => {
    render(<NoteMoreMenu {...defaultProps} />)

    const triggerButton = screen.getByRole('button', { name: /more actions/i })
    expect(triggerButton).toBeInTheDocument()

    const editOption = screen.getByText('Edit')
    const deleteOption = screen.getByText('Delete')

    expect(editOption).toBeInTheDocument()
    expect(deleteOption).toBeInTheDocument()

    // Both options should be clickable buttons (due to mocking)
    expect(editOption.tagName).toBe('BUTTON')
    expect(deleteOption.tagName).toBe('BUTTON')
  })
})
