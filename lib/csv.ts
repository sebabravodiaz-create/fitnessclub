export function toCSV(rows: string[][], options: { includeBom?: boolean } = {}): string {
  const { includeBom = true } = options
  const content = rows
    .map((row) =>
      row
        .map((value) => {
          const cell = value ?? ''
          if (/[",\n]/.test(cell)) {
            return `"${cell.replace(/"/g, '""')}"`
          }
          return cell
        })
        .join(','),
    )
    .join('\n')

  return includeBom ? `\uFEFF${content}` : content
}
