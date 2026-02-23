import { CashFlowForecast, ForecastSimulationScenario } from '../../services/erpService';
import { formatUsDateTime } from '../datetime';

export type ForecastHorizon = 30 | 60 | 90;

export const parseNumericInput = (value: string) => {
  const sanitized = value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');

  if (!sanitized) {
    return null;
  }

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatForecastDateLabel = (value: string) => {
  return formatUsDateTime(value, value);
};

export const countRiskDays = (forecast: CashFlowForecast | null) => {
  if (!forecast) {
    return 0;
  }
  return forecast.dailyProjection.filter((day) => day.isRiskDay).length;
};

export const sanitizeScenarios = (scenarios: ForecastSimulationScenario[]) => {
  return scenarios
    .map((scenario) => ({
      ...scenario,
      scenarioName: scenario.scenarioName.trim(),
    }))
    .filter((scenario) => scenario.scenarioName.length > 0);
};
