import { parseChordPro, type ParsedLine } from '../lib/chordpro.ts'
import { transposeChord } from '../lib/transpose.ts'
import './SongBody.css'

type Props = {
  body: string
  chordsOn: boolean
  transpose: number
}

// Annotate lyric lines that fall inside a refrain block (from a refrain-label
// line up to the next blank line). Purely presentational; the parser is unchanged.
function markRefrains(lines: ParsedLine[]) {
  let inRefrain = false
  return lines.map((line) => {
    if (line.type === 'blank') {
      inRefrain = false
      return { line, inRefrain: false }
    }
    if (line.type === 'refrain-label') {
      inRefrain = true
      return { line, inRefrain: false }
    }
    return { line, inRefrain }
  })
}

export function SongBody({ body, chordsOn, transpose }: Props) {
  const decorated = markRefrains(parseChordPro(body))

  return (
    <div className="song-body">
      {decorated.map(({ line, inRefrain: isRefrainBody }, i) => {
        if (line.type === 'blank') {
          return <div key={i} className="song-line song-line--blank" />
        }
        if (line.type === 'refrain-label') {
          return (
            <div key={i} className="song-line song-line--refrain">
              {line.text}
            </div>
          )
        }
        // Lines made only of chords (e.g. an intro) carry nothing to read
        // when chords are hidden.
        if (
          !chordsOn &&
          line.segments.every((seg) => seg.chord && seg.text.trim() === '')
        ) {
          return null
        }
        const lineClass = isRefrainBody
          ? 'song-line song-line--refrain-body'
          : 'song-line'
        return (
          <div key={i} className={lineClass}>
            {line.segments.map((seg, j) => (
              <span
                key={j}
                className={
                  seg.chord && seg.text.trim() === ''
                    ? 'seg seg--chord-only'
                    : 'seg'
                }
              >
                {chordsOn && (
                  <span className="seg__chord">
                    {seg.chord ? transposeChord(seg.chord, transpose) : ''}
                  </span>
                )}
                <span className="seg__text">{seg.text}</span>
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}
