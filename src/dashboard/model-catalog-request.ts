import type { BotConfig } from '../bot-registry.js';
import { botInjectedEnv, buildSessionChildEnv } from '../core/env-policy.js';
import {
  lookupCliSelection,
  lookupCliSelectionForBotShape,
  resolveCliSelection,
} from '../setup/cli-selection.js';

export interface ModelCatalogProbeContext {
  cliId: ReturnType<typeof resolveCliSelection>['cliId'];
  runtimeExecutable: string | undefined;
  runtimeContext: string | undefined;
  probeEnv: NodeJS.ProcessEnv | undefined;
}

/**
 * Derive Bot-specific probe inputs only when the persisted launch shape
 * exactly matches the requested selection. Unknown wrappers and launch modes
 * must probe with the default CLI environment, never Bot credentials.
 */
export function modelCatalogProbeContext(
  key: string,
  botConfig: BotConfig | undefined,
  baseEnv: NodeJS.ProcessEnv,
): ModelCatalogProbeContext {
  const cliId = resolveCliSelection(key).cliId;
  const requestedSelection = lookupCliSelection(key);
  const persistedSelection = botConfig
    ? lookupCliSelectionForBotShape(botConfig.cliId, botConfig.wrapperCli, botConfig.cliLaunchMode)
    : undefined;
  const runtimeApplies = botConfig !== undefined
    && requestedSelection !== undefined
    && persistedSelection?.key === requestedSelection.key;
  const runtimeExecutable = runtimeApplies
    && !persistedSelection.wrapperCli
    && !persistedSelection.cliLaunchMode
    ? botConfig.cliRuntime?.executable ?? botConfig.cliPathOverride ?? undefined
    : undefined;
  return {
    cliId,
    runtimeExecutable,
    runtimeContext: runtimeApplies
      ? `${botConfig.larkAppId}:${cliId}:${runtimeExecutable ?? 'default'}`
      : undefined,
    probeEnv: runtimeApplies
      ? {
          ...buildSessionChildEnv(baseEnv, botConfig.envPolicy),
          ...botInjectedEnv(botConfig.env, botConfig.envPolicy),
        }
      : undefined,
  };
}
