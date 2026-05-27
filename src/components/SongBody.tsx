import { parseChordPro } from '../lib/chordpro.ts'
import { transposeChord } from '../lib/transpose.ts'
import './SongBody.css'

type Props = {
  body: string
  chordsOn: boolean
  transpose: number
}

export function SongBody({ body, chordsOn, transpose }: Props) {
  const lines = parseChordPro(body)
  return (
    <div className="song-body">
      {lines.map((line, i) => {
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
        return (
          <div key={i} className="song-line">
            {line.segments.map((seg, j) => (
              <span key={j} className="seg">
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
