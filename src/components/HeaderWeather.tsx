import { useEffect, useMemo, useState } from 'react'
import { warningIconUrl, weatherIconUrl } from '../services/hkoWeatherApi'
import type { WeatherDisplay } from '../types/weather'
import { useTranslation } from '../i18n/I18nContext'
import { openHkoWeather } from '../utils/hkoLinks'

const ROTATE_INTERVAL_MS = 10_000
const FADE_DURATION_MS = 400

interface HeaderWeatherProps {
  display: WeatherDisplay | null
}

type WeatherIconSlide = {
  kind: 'weather'
  iconCode: number
}

type WarningIconSlide = {
  kind: 'warning'
  warningCode: string
  label: string
}

type IconSlide = WeatherIconSlide | WarningIconSlide

function buildIconSequence(display: WeatherDisplay): IconSlide[] {
  const weather: WeatherIconSlide | null =
    display.iconCode !== null ? { kind: 'weather', iconCode: display.iconCode } : null

  if (display.slides.length === 0) {
    return weather ? [weather] : []
  }

  const sequence: IconSlide[] = []
  for (const slide of display.slides) {
    if (weather) sequence.push(weather)
    sequence.push({
      kind: 'warning',
      warningCode: slide.warningCode,
      label: slide.label,
    })
  }
  return sequence
}

function IconSlideView({ slide }: { slide: IconSlide }) {
  if (slide.kind === 'weather') {
    return (
      <img
        className="header-weather__wx-icon"
        src={weatherIconUrl(slide.iconCode)}
        alt=""
        width={28}
        height={28}
        loading="eager"
        decoding="sync"
      />
    )
  }

  const icon = warningIconUrl(slide.warningCode)
  if (!icon) return null

  return (
    <img
      className="header-weather__warn-icon"
      src={icon}
      alt={slide.label}
      width={22}
      height={22}
      decoding="async"
    />
  )
}

export function HeaderWeather({ display }: HeaderWeatherProps) {
  const { locale, t } = useTranslation()
  const iconSlides = useMemo(
    () => (display ? buildIconSequence(display) : []),
    [display],
  )
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const activeSlide = iconSlides[index % iconSlides.length]
  const temperature = display?.temperature ?? null

  useEffect(() => {
    setIndex(0)
    setFading(false)
  }, [iconSlides])

  useEffect(() => {
    if (iconSlides.length <= 1) return

    const id = setInterval(() => {
      setFading(true)
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % iconSlides.length)
        setFading(false)
      }, FADE_DURATION_MS)
    }, ROTATE_INTERVAL_MS)

    return () => clearInterval(id)
  }, [iconSlides])

  if (!display || (!activeSlide && temperature === null)) return null

  return (
    <button
      type="button"
      className="header-weather btn-touch"
      aria-live="polite"
      aria-label={t('openHkoWeather')}
      onClick={() => openHkoWeather(locale)}
    >
      {activeSlide && (
        <div
          className={`header-weather__icon${fading ? ' header-weather__icon--fading' : ''}`}
        >
          <IconSlideView slide={activeSlide} />
        </div>
      )}
      {temperature !== null && (
        <span className="header-weather__temp">{temperature}°</span>
      )}
    </button>
  )
}
