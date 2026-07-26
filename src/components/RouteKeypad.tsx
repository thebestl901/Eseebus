import { useMemo } from 'react'
import { useTranslation } from '../i18n/I18nContext'

const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
/** Fallback before route index loads — covers KMB, Citybus & GMB route suffixes. */
const DEFAULT_SUFFIX_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'M', 'N', 'P', 'R', 'S', 'T', 'W', 'X']

interface RouteKeypadProps {
  value: string
  onChange: (value: string) => void
  /** null = show all keys (initial / empty query) */
  validKeys?: Set<string> | null
  /** Letter keys shown on the suffix row(s), derived from loaded route catalog. */
  suffixKeys?: string[]
}

function keyClass(key: string, smartActive: boolean, validKeys: Set<string>, extra = ''): string {
  const classes = ['keypad-btn', extra].filter(Boolean)
  if (!smartActive) return classes.join(' ')
  classes.push(validKeys.has(key) ? 'keypad-btn--valid' : 'keypad-btn--disabled')
  return classes.join(' ')
}

export function RouteKeypad({ value, onChange, validKeys, suffixKeys }: RouteKeypadProps) {
  const { t } = useTranslation()
  const letters = suffixKeys?.length ? suffixKeys : DEFAULT_SUFFIX_KEYS
  const smartActive = validKeys !== null && validKeys !== undefined

  const digitKeys = DIGIT_KEYS

  const suffixDisplayKeys = useMemo(() => {
    if (!smartActive) return letters
    return letters.filter((key) => validKeys.has(key))
  }, [letters, smartActive, validKeys])

  const append = (key: string) => {
    if (smartActive && !validKeys.has(key)) return
    onChange(value + key)
  }
  const backspace = () => onChange(value.slice(0, -1))
  const clear = () => onChange('')

  return (
    <div className={`keypad keypad--full${smartActive ? ' keypad--smart' : ''}`}>
      <div className="keypad__display" aria-live="polite">
        {value || t('keypadPlaceholder')}
      </div>
      <div className="keypad__grid">
        {digitKeys.map((key) => (
          <button
            key={key}
            type="button"
            className={keyClass(key, smartActive, validKeys ?? new Set())}
            disabled={smartActive && !validKeys.has(key)}
            onClick={() => append(key)}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="keypad__suffix-grid">
        {suffixDisplayKeys.map((key) => (
          <button
            key={key}
            type="button"
            className={keyClass(key, smartActive, validKeys ?? new Set(), 'keypad-btn--suffix')}
            disabled={smartActive && !validKeys.has(key)}
            onClick={() => append(key)}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="keypad__actions">
        <button type="button" className="keypad-btn keypad-btn--action" onClick={backspace}>
          {t('keypadBackspace')}
        </button>
        <button type="button" className="keypad-btn keypad-btn--action" onClick={clear}>
          {t('keypadClear')}
        </button>
      </div>
    </div>
  )
}

export { DEFAULT_SUFFIX_KEYS as ROUTE_KEYPAD_SUFFIX_KEYS }
