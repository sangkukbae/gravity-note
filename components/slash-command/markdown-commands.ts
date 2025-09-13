import {
  Hash,
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Code2,
  Link,
  Quote,
  Minus,
  type LucideIcon,
} from 'lucide-react'

export interface MarkdownCommand {
  id: string
  title: string
  description: string
  icon: LucideIcon
  searchTerms: string[]
  markdown: string
  cursorOffset?: number
}

export const markdownCommands: MarkdownCommand[] = [
  {
    id: 'heading1',
    title: '제목 1',
    description: 'Heading 1',
    icon: Hash,
    searchTerms: ['heading', 'h1', 'title', '제목', '1'],
    markdown: '# ',
    cursorOffset: 2,
  },
  {
    id: 'heading2',
    title: '제목 2',
    description: 'Heading 2',
    icon: Hash,
    searchTerms: ['heading', 'h2', 'subtitle', '제목', '2'],
    markdown: '## ',
    cursorOffset: 3,
  },
  {
    id: 'heading3',
    title: '제목 3',
    description: 'Heading 3',
    icon: Hash,
    searchTerms: ['heading', 'h3', '제목', '3'],
    markdown: '### ',
    cursorOffset: 4,
  },
  {
    id: 'bold',
    title: '굵게',
    description: 'Bold text',
    icon: Bold,
    searchTerms: ['bold', 'strong', '굵게', 'b'],
    markdown: '**텍스트**',
    cursorOffset: 2,
  },
  {
    id: 'italic',
    title: '기울임',
    description: 'Italic text',
    icon: Italic,
    searchTerms: ['italic', 'emphasis', '기울임', 'i'],
    markdown: '*텍스트*',
    cursorOffset: 1,
  },
  {
    id: 'bulletList',
    title: '글머리 기호',
    description: 'Bullet list',
    icon: List,
    searchTerms: ['bullet', 'list', 'unordered', '글머리', '목록', 'ul'],
    markdown: '- ',
    cursorOffset: 2,
  },
  {
    id: 'numberedList',
    title: '번호 목록',
    description: 'Numbered list',
    icon: ListOrdered,
    searchTerms: ['number', 'ordered', 'list', '번호', '목록', 'ol'],
    markdown: '1. ',
    cursorOffset: 3,
  },
  {
    id: 'checkbox',
    title: '체크박스',
    description: 'Checkbox',
    icon: CheckSquare,
    searchTerms: ['checkbox', 'task', 'todo', '체크', '할일'],
    markdown: '- [ ] ',
    cursorOffset: 6,
  },
  {
    id: 'code',
    title: '코드',
    description: 'Inline code',
    icon: Code,
    searchTerms: ['code', 'inline', '코드', 'c'],
    markdown: '`코드`',
    cursorOffset: 1,
  },
  {
    id: 'codeBlock',
    title: '코드 블록',
    description: 'Code block',
    icon: Code2,
    searchTerms: ['code', 'block', 'snippet', '코드', '블록'],
    markdown: '```\n\n```',
    cursorOffset: 4,
  },
  {
    id: 'link',
    title: '링크',
    description: 'Link',
    icon: Link,
    searchTerms: ['link', 'url', '링크', 'l'],
    markdown: '[텍스트](url)',
    cursorOffset: 1,
  },
  {
    id: 'quote',
    title: '인용',
    description: 'Blockquote',
    icon: Quote,
    searchTerms: ['quote', 'blockquote', '인용', 'q'],
    markdown: '> ',
    cursorOffset: 2,
  },
  {
    id: 'divider',
    title: '구분선',
    description: 'Horizontal divider',
    icon: Minus,
    searchTerms: ['divider', 'line', 'separator', '구분', 'hr'],
    markdown: '\n---\n',
    cursorOffset: 5,
  },
]
