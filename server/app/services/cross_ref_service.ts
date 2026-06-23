interface CrossRefAuthor {
  given?: string
  family: string
}

interface CrossRefItem {
  title?: string[]
  author?: CrossRefAuthor[]
  published?: { 'date-parts': number[][] }
  'container-title'?: string[]
  DOI?: string
  volume?: string
  issue?: string
  page?: string
}

interface CrossRefResponse {
  message?: { items?: CrossRefItem[] }
}

function formatAPA(item: CrossRefItem): string {
  const authors = (item.author ?? [])
    .slice(0, 6)
    .map((a) => `${a.family}, ${a.given ? a.given[0] + '.' : ''}`)
    .join(', ')

  const year = item.published?.['date-parts']?.[0]?.[0] ?? 'n.d.'
  const title = item.title?.[0] ?? 'Untitled'
  const journal = item['container-title']?.[0]

  let citation = authors ? `${authors} (${year}). ${title}.` : `(${year}). ${title}.`
  if (journal) citation += ` ${journal}`
  if (item.volume) citation += `, ${item.volume}`
  if (item.issue) citation += `(${item.issue})`
  if (item.page) citation += `, ${item.page}`
  citation += '.'
  if (item.DOI) citation += ` https://doi.org/${item.DOI}`

  return citation
}

export async function searchCrossRef(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    query,
    rows: '1',
    select: 'title,author,published,container-title,DOI,volume,issue,page',
  })

  let res: Response
  try {
    res = await fetch(`https://api.crossref.org/works?${params}`, {
      headers: { 'User-Agent': 'Fakelet/1.0 (mailto:admin@k20center.ou.edu)' },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as CrossRefResponse
  const item = data.message?.items?.[0]
  if (!item?.title?.length) return null

  return formatAPA(item)
}
